import { MongoClient, ObjectId } from 'mongodb'; // Import ObjectId
import type { NextApiResponse } from 'next';
import clientPromise, { DB_NAME } from '@/lib/mongodb';
import { NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/withAuth';
import { sanitizeStaffRoleIds } from '@/utils/staffRoles';
import { createHistoryEntries } from '@/utils/equipmentHistoryUtils';
import { releaseEquipmentFromEvent } from '@/lib/equipmentRelease';
import { NewEquipment } from '@/components/equipmentStockTable/types';
import { normalizeMapsUrl, MAPS_URL_ERROR } from '@/utils/mapsUtils';
import { getPermissions } from '@/utils/roleUtils';
import { withRealEquipmentPrices } from '@/lib/equipmentPriceGuard';
import { sanitizeEventForRole } from '@/lib/sanitizeEvent';
import { checkBookingConflicts } from '@/lib/bookingGuard';
import { eventKindOf, sanitizeKindUpdate } from '@/utils/eventKind';
import { withoutCategoryItems } from '@/utils/categoryItemGuard';
import { categoryIdsAmong } from '@/lib/categoryItemGuardServer';
import { reservationStart, arDateTimeLabel } from '@/utils/reservationRange';
import { sumRentalPrice } from '@/utils/equipmentPrices';
import { bookingConflictMessage } from '@/utils/equipmentSuggestions';
import {
  stripServerOnlyFields,
  validateResolutions,
  applyLocalResolutions,
  ConflictResolution,
  DateConflict
} from '@/utils/dateChangeConflicts';
import {
  loadConflictReport,
  swapUnitsInOtherEvent,
  releaseStaleUse,
  ConflictChangedError
} from '@/lib/dateConflictsServer';

const conflictText = (conflicts: DateConflict[]) =>
  bookingConflictMessage(conflicts.map((c) => ({ name: c.name, code: c.code, busyWith: c.busyWith })));

// Solo admin y manager pueden editar eventos
export const PUT = withAuth(async (context: AuthContext, req: Request) => {
  try {
    const typedClientPromise: Promise<MongoClient> =
      clientPromise as Promise<MongoClient>;
    const client = await typedClientPromise;
    // `conflictResolutions` (lo elegido en la ventana de choques) y
    // `markNoticeSeen` (botón "Visto" de un aviso) no se guardan tal cual; los
    // avisos (`equipmentChangeNotices`) solo los escribe el servidor.
    const {
      conflictResolutions,
      markNoticeSeen,
      ...body
    }: { conflictResolutions?: ConflictResolution[]; markNoticeSeen?: string; [k: string]: any } =
      stripServerOnlyFields(await req.json());
    const db = client.db(DB_NAME);
    const eventId = body._id;
    // Una categoría nunca se guarda como equipo (pasaba al tocar una subcategoría
    // en la tabla de Equipamiento). Antes de todo: el diff de equipos usa esto.
    if (Array.isArray(body.equipment)) {
      body.equipment = withoutCategoryItems(body.equipment, await categoryIdsAmong(db, body.equipment)).equipment;
      // `nearWith` (aviso de eventos a menos de 6 h) es solo para mostrar: no se guarda
      body.equipment = body.equipment.map(({ nearWith: _near, ...e }: any) => e);
    }
    let eventEquipment = body.equipment;
    delete body._id;

    console.log('=== UPDATE EVENT CALLED ===');
    console.log('Event ID:', eventId);
    console.log('Equipment in body:', eventEquipment?.length || 0, 'items');
    console.log('Nueva fecha:', body.date);
    console.log('Nueva fecha fin:', body.endDate);

    // Obtener evento antiguo para comparar equipos
    const oldEvent = await db
      .collection('events')
      .findOne({ _id: new ObjectId(eventId) });

    // Preparar datos para actualizar. El tipo (evento / alquiler) queda fijo una
    // vez creado, y un alquiler no guarda Show, Música, Timing ni Archivos.
    const { createdAt, updatedAt, ...rawUpdateData } = body;
    const updateData: any = sanitizeKindUpdate(rawUpdateData, eventKindOf(oldEvent));

    // Link de Google Maps del lugar: normalizar si viene, rechazar si no es de Maps
    if ('venueMapsUrl' in updateData) {
      const venueMapsUrl = normalizeMapsUrl(updateData.venueMapsUrl);
      if (venueMapsUrl === null) {
        return NextResponse.json({ error: MAPS_URL_ERROR }, { status: 400 });
      }
      updateData.venueMapsUrl = venueMapsUrl;
    }
    // Roles del staff (catálogo): solo ids válidos
    if ('staff' in updateData) updateData.staff = sanitizeStaffRoleIds(updateData.staff);

    // GUARD teléfonos: nunca persistir un teléfono ofuscado ('****'). Si un rol
    // sin permiso para ver teléfonos edita el evento, el phoneNumber llega como
    // '****'; restauramos el real (del evento viejo, o del cliente referenciado)
    // para no corromper el dato. Aplica a cliente principal y clientes extra.
    const isObfuscatedPhone = (v: any) =>
      typeof v === 'string' && /^\*+$/.test(v.trim());

    if (isObfuscatedPhone(updateData.phoneNumber)) {
      updateData.phoneNumber = oldEvent?.phoneNumber ?? '';
    }

    if (Array.isArray(updateData.extraClients)) {
      updateData.extraClients = await Promise.all(
        updateData.extraClients.map(async (ec: any) => {
          if (!isObfuscatedPhone(ec?.phoneNumber)) return ec;
          // 1) restaurar desde el mismo extra client del evento viejo (por _id)
          const match = Array.isArray(oldEvent?.extraClients)
            ? oldEvent!.extraClients.find(
                (e: any) => e?._id && ec?._id && String(e._id) === String(ec._id)
              )
            : null;
          if (match) return { ...ec, phoneNumber: match.phoneNumber ?? '' };
          // 2) si referencia un cliente existente, tomar el teléfono real
          if (ec?._id) {
            try {
              const realClient = await db
                .collection('clients')
                .findOne({ _id: new ObjectId(String(ec._id)) });
              if (realClient) {
                return { ...ec, phoneNumber: realClient.phoneNumber ?? '' };
              }
            } catch {
              /* _id no es ObjectId válido; caemos al default */
            }
          }
          // 3) sin forma de resolverlo → no persistir '****'
          return { ...ec, phoneNumber: '' };
        })
      );
    }

    // Rango de la RESERVA de equipos (arranca con la llegada del equipamiento si
    // corresponde, ver utils/reservationRange). Con cuerpos parciales se completa
    // con lo guardado.
    const mergedForRange: any = { ...(oldEvent || {}), ...body };
    const newResStart = reservationStart(mergedForRange);
    const newResEnd = new Date(mergedForRange.endDate);
    const rangeChanged =
      !!oldEvent &&
      Number.isFinite(newResStart.getTime()) &&
      Number.isFinite(newResEnd.getTime()) &&
      (reservationStart(oldEvent as any).getTime() !== newResStart.getTime() ||
        +new Date(oldEvent.endDate as any) !== newResEnd.getTime());
    // Choques al cambiar el RANGO: el 409 trae los datos para la ventana
    // (`DateConflictModal`), sin requests extra para abrirla.
    const applied: { otherEventId: string; otherEventName: string; fromCode: string; toCode: string }[] = [];
    const rangeConflictResponse = async (equipmentIds: string[], error?: string) => {
      const conflicts = await loadConflictReport(db, {
        eventId: String(eventId),
        start: newResStart,
        end: newResEnd,
        eventEquipmentIds: equipmentIds
      });
      if (!conflicts.length) return null;
      return NextResponse.json(
        { error: error || conflictText(conflicts), conflicts, ...(applied.length ? { applied } : {}) },
        { status: 409 }
      );
    };

    // Lo elegido en la ventana: se revalida TODO contra la base y se aplica
    // (primero en los otros eventos, después en este) antes del guard normal.
    if (Array.isArray(conflictResolutions) && conflictResolutions.length && rangeChanged) {
      const baseEquipment: any[] = Array.isArray(body.equipment) ? body.equipment : oldEvent?.equipment || [];
      const baseExtra: any[] = Array.isArray(body.extraEquipment) ? body.extraEquipment : oldEvent?.extraEquipment || [];
      const baseIds = baseEquipment.map((e: any) => String(e._id));
      const report = await loadConflictReport(db, {
        eventId: String(eventId),
        start: newResStart,
        end: newResEnd,
        eventEquipmentIds: baseIds
      });
      if (validateResolutions(report, conflictResolutions).length) {
        return NextResponse.json(
          { error: 'Los equipos cambiaron mientras elegías. Revisá de nuevo.', conflicts: report },
          { status: 409 }
        );
      }
      const fromEventName = mergedForRange.type || mergedForRange.name || 'otro evento';
      const byName = context.user?.name || context.user?.email || '';
      try {
        const byOther = new Map<string, { fromId: string; toId: string }[]>();
        for (const r of conflictResolutions) {
          if (r.action !== 'replaceInOther') continue;
          byOther.set(r.otherEventId, [...(byOther.get(r.otherEventId) || []), { fromId: r.equipmentId, toId: r.toId }]);
        }
        for (const [otherEventId, swaps] of Array.from(byOther.entries())) {
          const changes = await swapUnitsInOtherEvent(db, {
            otherEventId,
            swaps,
            fromEventId: String(eventId),
            fromEventName,
            userSub: context.user?.sub,
            byName
          });
          const otherEventName =
            report.find((c) => c.busyWith[0]?.eventId === otherEventId)?.busyWith[0]?.eventName || '';
          applied.push(...changes.map((c) => ({ otherEventId, otherEventName, ...c })));
        }
        for (const r of conflictResolutions) {
          if (r.action === 'releaseOrphan') {
            await releaseStaleUse(db, { equipmentId: r.equipmentId, orphanEventId: r.orphanEventId, userSub: context.user?.sub });
          }
        }
      } catch (err) {
        if (!(err instanceof ConflictChangedError)) throw err;
        const res = await rangeConflictResponse(baseIds, 'Los equipos cambiaron mientras elegías. Revisá de nuevo.');
        if (res) return res;
      }

      const toIds = conflictResolutions.flatMap((r) => (r.action === 'replaceHere' ? [String(r.toId)] : []));
      const units = toIds.length
        ? await db
            .collection('equipment')
            .find(
              { _id: { $in: toIds.filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id)) } },
              { projection: { history: 0 } }
            )
            .toArray()
        : [];
      const local = applyLocalResolutions(
        baseEquipment,
        baseExtra,
        conflictResolutions,
        new Map(units.map((u: any) => [String(u._id), u]))
      );
      // El cuerpo queda completo para que corra el diff normal de equipos
      // (reservas + historial de agregados/quitados), aunque haya llegado parcial
      for (const k of ['date', 'endDate', 'type', 'name', 'lugar', 'fullName']) {
        if (!(k in body)) body[k] = mergedForRange[k];
      }
      body.equipment = local.equipment;
      body.extraEquipment = local.extraEquipment;
      eventEquipment = local.equipment;
      Object.assign(updateData, {
        date: body.date,
        endDate: body.endDate,
        equipment: local.equipment,
        extraEquipment: local.extraEquipment,
        equipmentPrice: sumRentalPrice(local.equipment)
      });
    }

    const fullEquipmentBody = Array.isArray(eventEquipment) && !!body.date && !!body.endDate;

    // GUARD doble asignación: los equipos NUEVOS del evento (o todos, si
    // cambió el rango de la reserva) no pueden estar reservados por otro evento
    // en esas fechas. Se valida ANTES de escribir nada.
    if (fullEquipmentBody) {
      if (rangeChanged) {
        const res = await rangeConflictResponse(eventEquipment.map((e: any) => String(e._id)));
        if (res) return res;
      } else {
        const prevIds = new Set((oldEvent?.equipment || []).map((e: any) => String(e._id)));
        const toCheck = eventEquipment.map((e: any) => String(e._id)).filter((id: string) => !prevIds.has(id));
        const conflictMsg = await checkBookingConflicts(db, toCheck, newResStart, newResEnd, eventId);
        if (conflictMsg) {
          return NextResponse.json({ error: conflictMsg }, { status: 409 });
        }
      }
    } else if (rangeChanged && (oldEvent?.equipment || []).length) {
      // Cuerpo parcial que cambia el rango (ej. solo la llegada del equipamiento
      // desde la página del evento): se chequean los equipos ya guardados
      const res = await rangeConflictResponse((oldEvent?.equipment || []).map((e: any) => String(e._id)));
      if (res) return res;
    }

    // GUARD datos ocultos: lo que el rol no puede ver le llega vacío/null desde
    // getEvent, así que NUNCA se persiste lo que manda (pisaría lo real).
    const permissions = getPermissions(context.role);
    // Pagos/presupuesto: solo admin. Al resto le llega payment: null.
    if (!permissions.canViewPayments) delete updateData.payment;
    // Precios de equipos: solo admin. Se completan con los reales.
    if (!permissions.canViewEquipmentPrices) {
      if (Array.isArray(updateData.equipment)) {
        const priced = await withRealEquipmentPrices(db, updateData.equipment, oldEvent?.equipment);
        updateData.equipment = priced.equipment;
        updateData.equipmentPrice = priced.equipmentPrice;
      } else {
        delete updateData.equipmentPrice;
      }
    }

    // Asegurar que updatedAt sea un timestamp y no sobrescribir createdAt
    const event = await db
      .collection('events')
      .findOneAndUpdate(
        { _id: new ObjectId(eventId) },
        {
          $set: {
            ...updateData,
            ...(markNoticeSeen
              ? {
                  'equipmentChangeNotices.$[n].seenAt': new Date().toISOString(),
                  'equipmentChangeNotices.$[n].seenByName': context.user?.name || context.user?.email || ''
                }
              : {}),
            updatedAt: new Date()
          }
        },
        {
          returnDocument: 'after',
          ...(markNoticeSeen ? { arrayFilters: [{ 'n.id': String(markNoticeSeen) }] } : {})
        }
      );

    // PERF: detectar si cambió algo relacionado a equipamiento. Los scheduledUses
    // dependen de: equipos, fechas, lugar, tipo y nombre del evento. Si nada de eso
    // cambió, NO hay que reprocesarlos (evita 2-3 updateMany pesados en cada edición
    // de otros campos, ej. el nombre del cliente).
    const oldEqIds = (oldEvent?.equipment || [])
      .map((e: any) => e._id?.toString())
      .sort();
    const newEqIds = (eventEquipment || [])
      .map((e: any) => e._id?.toString())
      .sort();
    const equipmentRelatedChanged =
      oldEqIds.length !== newEqIds.length ||
      oldEqIds.some((id: string, i: number) => id !== newEqIds[i]) ||
      +new Date(oldEvent?.date as any) !== +new Date(body.date) ||
      +new Date(oldEvent?.endDate as any) !== +new Date(body.endDate) ||
      (oldEvent?.lugar || '') !== (body.lugar || '') ||
      (oldEvent?.type || '') !== (body.type || '') ||
      (oldEvent?.name || '') !== (body.name || '') ||
      rangeChanged;

    // Solo procesar diff de equipamiento si el body incluye equipment (evita
    // corrupción en ediciones parciales) Y realmente cambió algo relevante.
    const diffRuns = eventEquipment !== undefined && !!body.date && !!body.endDate && equipmentRelatedChanged;
    if (diffRuns) {
      const oldEquipmentIds = (oldEvent?.equipment || []).map(
        (eq: any) => eq._id.toString()
      );
      const newEquipmentIds = (eventEquipment || []).map((eq: any) =>
        eq._id.toString()
      );
      const addedEquipmentIds = newEquipmentIds.filter(
        (id: string) => !oldEquipmentIds.includes(id)
      );
      const removedEquipmentIds = oldEquipmentIds.filter(
        (id: string) => !newEquipmentIds.includes(id)
      );
      const keptEquipmentIds = oldEquipmentIds.filter(
        (id: string) => newEquipmentIds.includes(id)
      );

      // La reserva arranca con la llegada del equipamiento (si corresponde)
      const eventStart = newResStart;
      const eventEnd = new Date(body.endDate);
      const now = new Date();

      // Resetear horas para comparación
      const eventStartDate = new Date(eventStart);
      eventStartDate.setHours(0, 0, 0, 0);
      const nowDate = new Date(now);
      nowDate.setHours(0, 0, 0, 0);

      // Determinar si el evento empieza HOY o ya empezó
      const isCurrentOrPast = eventStartDate <= nowDate;
      const eventoActivo = now <= eventEnd;

      // Crear el objeto scheduledUse actualizado
      const scheduledUse = {
        eventId: eventId,
        eventName: body.name || body.type,
        eventType: body.type,
        startDate: eventStart,
        endDate: eventEnd,
        location: body.lugar
      };

      // PASO 1: Actualizar scheduledUse para equipos que SIGUEN en el evento
      if (keptEquipmentIds.length > 0) {
        const keptObjectIds = keptEquipmentIds.map((id: string) => new ObjectId(id));

        // Remover el scheduledUse viejo y agregar el nuevo
        await db.collection<NewEquipment>('equipment').updateMany(
          { _id: { $in: keptObjectIds } },
          {
            $pull: { scheduledUses: { eventId: eventId } }
          }
        );

        await db.collection<NewEquipment>('equipment').updateMany(
          { _id: { $in: keptObjectIds } },
          {
            $push: { scheduledUses: {$each: [scheduledUse]} }
          }
        );

        // Si el evento es actual/pasado, actualizar estado
        if (isCurrentOrPast && eventoActivo) {
          await db.collection('equipment').updateMany(
            { _id: { $in: keptObjectIds } },
            {
              $set: {
                lastUsedStartDate: eventStart,
                lastUsedEndDate: eventEnd,
                location: body.lugar,
                outOfService: {
                  isOut: true,
                  reason: 'En Evento',
                  details: `${body.type} - ${body.lugar}`
                }
              }
            }
          );
        } else if (!eventoActivo) {
          // Si el evento ya terminó, limpiar
          await db.collection('equipment').updateMany(
            { _id: { $in: keptObjectIds } },
            {
              $set: {
                lastUsedStartDate: null,
                lastUsedEndDate: null,
                location: 'Deposito',
                outOfService: {
                  isOut: false,
                  reason: null,
                  details: null
                }
              }
            }
          );
        }
      }

      // PASO 2: Agregar scheduledUse para equipos NUEVOS
      if (addedEquipmentIds.length > 0) {
        const addedObjectIds = addedEquipmentIds.map((id: string) => new ObjectId(id));

        await db.collection<NewEquipment>('equipment').updateMany(
          { _id: { $in: addedObjectIds } },
          {
            $push: { scheduledUses: scheduledUse }
          }
        );

        // Si el evento es actual/pasado, actualizar estado
        if (isCurrentOrPast && eventoActivo) {
          await db.collection('equipment').updateMany(
            { _id: { $in: addedObjectIds } },
            {
              $set: {
                lastUsedStartDate: eventStart,
                lastUsedEndDate: eventEnd,
                location: body.lugar,
                outOfService: {
                  isOut: true,
                  reason: 'En Evento',
                  details: `${body.type} - ${body.lugar}`
                }
              }
            }
          );
        }

        // Registrar en historial: UNA sola escritura (antes una por equipo)
        await createHistoryEntries(
          db,
          eventEquipment
            .filter((eq: any) => addedEquipmentIds.includes(eq._id.toString()))
            .map((eq: any) => ({
              equipmentId: eq._id,
              equipmentName: eq.name,
              equipmentCode: eq.code,
              action: 'uso_evento' as const,
              userId: context.user?.sub,
              eventId: eventId,
              eventName: body.type,
              eventDate: eventStart,
              eventEndDate: eventEnd,
              eventLocation: body.lugar,
              eventClientName: body.fullName,
              details: `${isCurrentOrPast ? 'Agregado a' : 'Programado para'} ${body.type} - ${body.lugar}`
            }))
        );
      }

      // PASO 3: Equipos REMOVIDOS: sacar la reserva de este evento y liberar
      // los que figuraban "En Evento" sin otro uso hoy (nunca los dados de
      // baja / en reparación). Escrituras agrupadas (ver lib/equipmentRelease).
      if (removedEquipmentIds.length > 0) {
        const released = await releaseEquipmentFromEvent(db, removedEquipmentIds, eventId);
        const oldById = new Map(
          (oldEvent?.equipment || []).map((eq: any) => [eq._id.toString(), eq])
        );
        await createHistoryEntries(
          db,
          released
            .filter((r) => oldById.has(r._id.toString()))
            .map((r) => {
              const old: any = oldById.get(r._id.toString());
              return {
                equipmentId: r._id.toString(),
                equipmentName: old.name,
                equipmentCode: old.code,
                action: 'cambio_estado' as const,
                userId: context.user?.sub,
                fromValue: 'En Evento',
                toValue:
                  r.decision === 'active'
                    ? 'En Evento (otro)'
                    : r.decision === 'free'
                    ? 'Disponible'
                    : 'Sin cambios (fuera de servicio o ya disponible)',
                details: `Removido de ${oldEvent?.type} - ${oldEvent?.lugar}`
              };
            })
        );
      }
    }
    // Cuerpo parcial que cambió el rango de la reserva (ej. solo la llegada del
    // equipamiento o su confirmación): se actualizan las fechas de las reservas
    // de ESTE evento en sus equipos (ya validado arriba que no chocan)
    if (!diffRuns && rangeChanged && (oldEvent?.equipment || []).length) {
      const ids = (oldEvent?.equipment || [])
        .map((e: any) => String(e._id))
        .filter((id: string) => ObjectId.isValid(id))
        .map((id: string) => new ObjectId(id));
      // Solo los equipos que de verdad tienen la reserva de este evento
      const withUse = new Set(
        (
          await db
            .collection('equipment')
            .find({ _id: { $in: ids }, 'scheduledUses.eventId': { $in: [eventId, String(eventId)] } }, { projection: { _id: 1 } })
            .toArray()
        ).map((e: any) => String(e._id))
      );
      await db.collection('equipment').updateMany(
        { _id: { $in: ids } },
        { $set: { 'scheduledUses.$[u].startDate': newResStart, 'scheduledUses.$[u].endDate': newResEnd } },
        { arrayFilters: [{ 'u.eventId': { $in: [eventId, String(eventId)] } }] }
      );
      // Regla 1: nunca cambiar scheduledUses sin historial (en lote)
      await createHistoryEntries(
        db,
        (oldEvent?.equipment || []).filter((eq: any) => withUse.has(String(eq._id))).map((eq: any) => ({
          equipmentId: eq._id,
          equipmentName: eq.name,
          equipmentCode: eq.code,
          action: 'uso_evento' as const,
          userId: context.user?.sub,
          eventId,
          eventName: mergedForRange.type,
          eventDate: newResStart,
          eventEndDate: newResEnd,
          eventLocation: mergedForRange.lugar,
          eventClientName: mergedForRange.fullName,
          details: `Reserva actualizada (llegada del equipamiento): ${arDateTimeLabel(newResStart)} a ${arDateTimeLabel(newResEnd)} - ${mergedForRange.type} - ${mergedForRange.lugar}`
        }))
      );
    }

    return NextResponse.json(
      { event: sanitizeEventForRole(event, context.role), ...(applied.length ? { applied } : {}) },
      { status: 201 }
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}, { requiredPermission: 'canEditEvents' });

// PATCH: Actualizar solo el orden de equipamiento (categorías y/o items dentro
// de cada categoría). Liviano, sin tocar equipos ni scheduledUses.
export const PATCH = withAuth(async (context: AuthContext, req: Request) => {
  try {
    const typedClientPromise: Promise<MongoClient> =
      clientPromise as Promise<MongoClient>;
    const client = await typedClientPromise;
    const body = await req.json();
    const db = client.db(DB_NAME);

    const { eventId, equipmentCategoryOrder, equipmentItemOrder } = body;

    if (!eventId) {
      return NextResponse.json({ error: 'eventId is required' }, { status: 400 });
    }

    // Setear solo los campos de orden que vengan en el body
    const update: Record<string, any> = { updatedAt: new Date() };
    if (Array.isArray(equipmentCategoryOrder)) {
      update.equipmentCategoryOrder = equipmentCategoryOrder;
    }
    if (equipmentItemOrder && typeof equipmentItemOrder === 'object') {
      update.equipmentItemOrder = equipmentItemOrder;
    }

    if (Object.keys(update).length === 1) {
      return NextResponse.json(
        { error: 'equipmentCategoryOrder or equipmentItemOrder is required' },
        { status: 400 }
      );
    }

    const event = await db
      .collection('events')
      .findOneAndUpdate(
        { _id: new ObjectId(eventId) },
        { $set: update },
        { returnDocument: 'after' }
      );

    return NextResponse.json({ event: sanitizeEventForRole(event, context.role) }, { status: 200 });
  } catch (error) {
    console.error('Error updating equipment order:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}, { requiredPermission: 'canEditEvents' });

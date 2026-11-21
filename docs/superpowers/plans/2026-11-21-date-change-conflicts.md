# Resolver choques al cambiar fechas — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cuando un cambio del rango de reserva de un evento choca con otro evento, abrir una ventana que resuelva cada equipo (otra unidad acá / cambiar en el otro evento / tercerizar / quitar / liberar reserva sobrante) y guardar todo en una sola request.

**Architecture:** Lógica pura en `src/utils/dateChangeConflicts.ts` (testeada). `updateEvent` devuelve el 409 con `conflicts` estructurados y acepta `conflictResolutions` en el mismo PUT; las escrituras sobre OTROS eventos/equipos viven en `src/lib/dateConflictsServer.ts`. En el front, un proveedor a nivel página (`DateConflictProvider`) intercepta el 409 y muestra `DateConflictModal`.

**Tech Stack:** Next.js 14 App Router, MongoDB driver, Mantine v8, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-21-date-change-conflicts-design.md`

## Global Constraints

- Código en inglés; comentarios, UI y mensajes en español; commits en español.
- Nunca un equipo en dos eventos con rangos solapados: el servidor revalida TODO al aplicar (no confía en lo que vio la pantalla).
- Nunca modificar `scheduledUses` sin historial (`createHistoryEntries`, en lote).
- No `$pull` + `$push` sobre `scheduledUses` en el mismo update: dos pasos.
- Precios: solo desde la base (`PRICE_FIELDS`), nunca del cliente; `equipmentPrice = sumRentalPrice(equipment)` en el evento que cambia. El 409 y el aviso NO llevan precios. `payment.totalToPay` no se toca.
- Permiso de todo: `canEditEvents` (ya lo exige el `withAuth` de `updateEvent`).
- Cuerpos parciales: nada se borra por ausencia de una clave; `equipmentChangeNotices` NUNCA se toma del body del cliente.
- Performance: abrir la ventana = 0 requests (datos en el 409); aplicar = 1 request; consultas del servidor con `Promise.all`.
- Mobile 390px: una tarjeta por equipo, opciones apiladas.
- Fechas visibles con `arDateTimeLabel` (hora AR).

## Review Focus

1. Dos choques que proponen la MISMA unidad libre como candidata → la ventana no deja elegirla dos veces y el servidor rechaza `toId` repetidos (test en Task 1 `validateResolutions`).
2. Alguien reserva la unidad elegida entre que se abrió la ventana y se aplicó → 409 con `conflicts` recalculados, la ventana se refresca sin perder lo ya elegido que siga válido (test en Task 1: `toId` que ahora choca → error `toId_busy`).
3. El guardado era parcial (solo `endDate`) y se elige tercerizar/quitar → el servidor completa con `equipment`/`extraEquipment` guardados y corre el diff normal, sin borrar los demás equipos (test en Task 1 `applyLocalResolutions` con equipo guardado completo).
4. Equipo que choca con DOS eventos a la vez → sin opción "cambiar en el otro evento" (`otherCandidates: []`), sí las demás (test en Task 1 `buildConflictReport`).
5. Un body completo viejo (`{...selectedEvent}`) que trae `equipmentChangeNotices` desactualizados → el servidor los ignora y no pisa avisos nuevos (test en Task 3 vía `stripServerOnlyFields`, Task 1).

---

### Task 1: Lógica pura de choques y resoluciones

**Files:**
- Create: `src/utils/dateChangeConflicts.ts`
- Test: `src/utils/dateChangeConflicts.test.ts`

**Interfaces:**
- Consumes: `conflictingUses`, `ScheduledUse` (`src/utils/equipmentAvailability.ts`); `rankUnitsForEvent`, `usedSameDay`, `equivalentModels` (`src/utils/equipmentSuggestions.ts`); `isEquipmentUnavailable`/`getUnavailabilityReason` para descartar dados de baja (`equipmentAvailability.ts`).
- Produces:
  ```ts
  export interface CandidateUnit { _id: string; name: string; code: string; sameDay: boolean; isEquivalent: boolean }
  export interface ConflictBusy { eventId: string; eventName: string; eventType: string; location: string; startDate: string; endDate: string;
    stale: boolean; otherEventEnded: boolean; otherEventInProgress: boolean }
  export interface DateConflict { equipmentId: string; name: string; code: string; categoryId: string | null;
    busyWith: ConflictBusy[]; hereCandidates: CandidateUnit[]; otherCandidates: CandidateUnit[] }
  export type ConflictResolution =
    | { equipmentId: string; action: 'replaceHere'; toId: string }
    | { equipmentId: string; action: 'replaceInOther'; otherEventId: string; toId: string }
    | { equipmentId: string; action: 'outsource' }
    | { equipmentId: string; action: 'remove' }
    | { equipmentId: string; action: 'releaseOrphan'; orphanEventId: string };
  export interface OtherEventInfo { _id: string; equipmentIds: string[]; start: Date; end: Date } // rango = reservationStart → endDate
  export interface EquipmentChangeNotice { id: string; at: string; byName: string; fromEventId: string; fromEventName: string;
    changes: { fromName: string; fromCode: string; toName: string; toCode: string }[]; seenAt?: string; seenByName?: string }

  export function buildConflictReport(args: {
    eventId: string; start: Date; end: Date;
    eventEquipmentIds: string[];              // equipos que quedarían en ESTE evento
    conflictingIds: string[];                 // los que chocan
    pool: any[];                              // equipos (con name, code, categoryId, scheduledUses, outOfService) de los modelos/categorías involucrados
    otherEvents: Map<string, OtherEventInfo>; // eventos referenciados por las reservas que chocan (los que existen)
    now: Date;
  }): DateConflict[]
  export function defaultResolution(c: DateConflict): ConflictResolution | null
  export type ResolutionError = { equipmentId: string; code: 'not_conflicting' | 'duplicate_to' | 'toId_busy' | 'other_not_allowed' | 'not_stale' | 'missing' };
  export function validateResolutions(report: DateConflict[], resolutions: ConflictResolution[]): ResolutionError[]
  export function applyLocalResolutions(equipment: any[], extraEquipment: any[], resolutions: ConflictResolution[], unitsById: Map<string, any>):
    { equipment: any[]; extraEquipment: any[] }
  export function buildChangeNotice(args: { byName: string; fromEventId: string; fromEventName: string; now: Date;
    changes: EquipmentChangeNotice['changes'] }): EquipmentChangeNotice
  export function stripServerOnlyFields<T extends Record<string, any>>(body: T): T  // quita equipmentChangeNotices
  ```

- [ ] **Step 1: Escribir los tests que fallan** (fixtures estilo `equipmentSuggestions.test.ts`: rango de la feria `2026-11-23T16:00:00Z → 2026-11-26T23:00:00Z`; cumple `2026-11-26T20:00:00Z → 2026-11-27T02:00:00Z`)

  - `buildConflictReport`:
    - `'ofrece acá unidades del mismo modelo libres en todo el rango nuevo, mejor primero'` → para CNSL-03 con CNSL-07 libre: `hereCandidates[0]` = `{ code: 'CNSL-07', isEquivalent: false }`.
    - `'agrega equivalentes de la misma categoría después del mismo modelo'` → `isEquivalent: true` al final.
    - `'otherCandidates: libres en el rango del OTRO evento y que no estén ya en él'` → excluye unidades en `otherEvents.get(id).equipmentIds`.
    - `'sin otherCandidates si choca con dos eventos'` → `otherCandidates: []`.
    - `'marca stale si el evento no existe o el equipo ya no está en su lista'` → `busyWith[0].stale === true` en ambos casos; `otherCandidates: []`.
    - `'marca otherEventInProgress cuando now está dentro del rango del otro'`.
    - `'nunca propone unidades dadas de baja ni las que ya están en este evento'`.
  - `defaultResolution`:
    - stale → `{ action: 'releaseOrphan', orphanEventId }`;
    - con `hereCandidates` → `replaceHere` con el primero;
    - sin acá y con otro (no en curso) → `replaceInOther`;
    - otro en curso y sin acá → `null` (el usuario elige);
    - nada → `null`.
  - `validateResolutions`:
    - `'rechaza toId repetido'` → `duplicate_to`;
    - `'rechaza toId que no está entre los candidatos'` → `toId_busy`;
    - `'rechaza replaceInOther si hay más de un evento o es stale'` → `other_not_allowed`;
    - `'rechaza releaseOrphan sobre una reserva real'` → `not_stale`;
    - `'pide resolución para cada choque'` → `missing`;
    - `'rechaza resoluciones de equipos que no chocan'` → `not_conflicting`.
  - `applyLocalResolutions`:
    - `replaceHere` cambia el renglón por la unidad nueva (con los `PRICE_FIELDS` de `unitsById`, nunca los del renglón viejo), misma posición;
    - `outsource` quita el renglón y suma `quantity: 1` al `extraEquipment` del mismo `name` (o crea `{ name, categoryId, mainCategoryName, quantity: 1 }`);
    - `remove` quita el renglón; `replaceInOther`/`releaseOrphan` no tocan este evento;
    - `'cuerpo parcial: con el equipo guardado completo solo cambian los renglones resueltos'` (59 renglones → 58 + 1 reemplazo, los demás iguales).
  - `buildChangeNotice` → `id` no vacío, `at` = `now.toISOString()`, sin campos de precio.
  - `stripServerOnlyFields({ _id: 'x', equipmentChangeNotices: [] })` → sin `equipmentChangeNotices`.

- [ ] **Step 2: Correr y ver que fallan**

  Run: `npx vitest run src/utils/dateChangeConflicts.test.ts`
  Expected: FAIL (módulo no existe).

- [ ] **Step 3: Implementar `src/utils/dateChangeConflicts.ts`** con las firmas de arriba. Candidatos acá: `pool` del mismo `name` (después misma `categoryId`, vía `equivalentModels`) que no estén en `eventEquipmentIds`, sin baja, con `conflictingUses(start, end, u.scheduledUses, { ignoreEventId: eventId })` vacío, ordenados con `rankUnitsForEvent`. Candidatos en el otro: igual con el rango del otro evento, `ignoreEventId` = el otro, excluyendo sus `equipmentIds`. Hasta 8 candidatos por lista.

- [ ] **Step 4: Correr y ver que pasan**

  Run: `npx vitest run src/utils/dateChangeConflicts.test.ts`
  Expected: PASS.

- [ ] **Step 5: Commit** — `git add src/utils/dateChangeConflicts.ts src/utils/dateChangeConflicts.test.ts && git commit -m "feat: lógica pura para resolver choques al cambiar fechas de un evento"`

---

### Task 2: Escrituras del servidor sobre otros eventos y reservas

**Files:**
- Create: `src/lib/dateConflictsServer.ts`

**Interfaces:**
- Consumes: Task 1 (`buildConflictReport`, `buildChangeNotice`, `OtherEventInfo`); `reservationStart` (`src/utils/reservationRange.ts`); `PRICE_FIELDS`, `sumRentalPrice` (`src/utils/equipmentPrices.ts`); `createHistoryEntries`; `releaseEquipmentFromEvent` (`src/lib/equipmentRelease.ts`).
- Produces:
  ```ts
  export async function loadConflictReport(db: Db, args: { eventId: string; start: Date; end: Date;
    eventEquipmentIds: string[]; conflictingIds: string[] }): Promise<DateConflict[]>
  export async function swapUnitInOtherEvent(db: Db, args: { otherEventId: string; fromId: string; toId: string;
    fromEventId: string; fromEventName: string; userSub?: string; byName: string }): Promise<{ fromCode: string; toCode: string }>
  export async function releaseStaleUse(db: Db, args: { equipmentId: string; orphanEventId: string; userSub?: string }): Promise<void>
  ```

- [ ] **Step 1: Implementar `loadConflictReport`**: `Promise.all` de (a) equipos que chocan → sus `name`/`categoryId`/reservas, (b) después `Promise.all` de pool (`{ $or: [{ name: { $in } }, { categoryId: { $in } }] }`, proyección `name code categoryId scheduledUses outOfService`) y `events` por los `eventId` de las reservas que chocan (proyección `equipment._id date endDate equipmentArrivalDate equipmentArrivalTime equipmentArrivalConfirmedFor type name lugar`). Arma `otherEvents` con `reservationStart(ev)`→`endDate` y llama a `buildConflictReport`. Total: 3 consultas.

- [ ] **Step 2: Implementar `swapUnitInOtherEvent`** en este orden (cada uno revalida antes de escribir):
  1. Leer el otro evento y la unidad `toId` (con `PRICE_FIELDS`, `scheduledUses`); si `toId` choca con el rango del otro evento o ya está en él → `throw new ConflictChangedError()` (exportar la clase).
  2. `events.updateOne` del otro evento: reemplazar el renglón `fromId` por `{ ...renglónViejo sin precio, _id, name, code, categoryId de toId, ...precios reales de toId }`, `equipmentPrice: sumRentalPrice(nuevo)`, `$push: { equipmentChangeNotices: buildChangeNotice(...) }` (si ya hay un aviso sin ver de ese mismo `fromEventId` creado en esta request, agregar el cambio a ese).
  3. Reserva: copiar el `scheduledUse` del otro evento desde `fromId` → `$push` en `toId`; si el otro evento está en curso, `toId` pasa a "En Evento" igual que en `updateEvent` paso 2.
  4. `releaseEquipmentFromEvent(db, [fromId], otherEventId)` (saca la reserva de `fromId` y lo libera si corresponde).
  5. `createHistoryEntries`: `uso_evento` en `toId` ("Reemplazo de X en <evento>") y `cambio_estado` en `fromId` ("Reemplazado por <toCode> en <evento>, al cambiar fechas de <fromEventName>").

- [ ] **Step 3: Implementar `releaseStaleUse`**: revalidar que el evento no existe o que el equipo no está en su `equipment` (si no, `throw new ConflictChangedError()`); `$pull: { scheduledUses: { eventId: { $in: [id, ObjectId?] } } }`; historial `cambio_estado` con `details: 'Reserva sin evento liberada (quedó de un guardado cortado)'`.

- [ ] **Step 4: Verificar tipos** — Run: `npx tsc --noEmit` · Expected: sin errores.

- [ ] **Step 5: Commit** — `git commit -m "feat: escrituras del servidor para cambiar unidades en otro evento y liberar reservas sobrantes"`

---

### Task 3: `updateEvent` — 409 con datos y aplicar resoluciones

**Files:**
- Modify: `src/app/api/updateEvent/route.ts:22-150` (body, guard de choques), `:150-170` (precios)
- Test: agregar casos en `src/utils/dateChangeConflicts.test.ts` si se extrae algo nuevo

**Interfaces:**
- Consumes: Tasks 1 y 2.
- Produces (contrato HTTP que usa Task 4):
  - 409 → `{ error: string, conflicts?: DateConflict[], applied?: { otherEventId: string; fromCode: string; toCode: string }[] }`. `conflicts` solo cuando cambió el rango (`rangeChanged`).
  - PUT body acepta `conflictResolutions?: ConflictResolution[]` y `markNoticeSeen?: string` (id del aviso).
  - 201 → `{ event, applied?: [...] }`.

- [ ] **Step 1: Body.** Al inicio: `const { conflictResolutions, markNoticeSeen, ...rest } = stripServerOnlyFields(body)`; que no lleguen a `$set`.

- [ ] **Step 2: 409 con datos.** En las dos ramas del guard (`fullEquipmentBody` y parcial con `rangeChanged`): si hay choque y `rangeChanged`, en vez de `checkBookingConflicts` usar `findBookingConflicts` para saber los ids y `loadConflictReport` → `NextResponse.json({ error: bookingConflictMessage(...), conflicts }, { status: 409 })`. Si no cambió el rango: 409 de siempre.

- [ ] **Step 3: Aplicar.** Si viene `conflictResolutions` y `rangeChanged`:
  1. Equipo base = `body.equipment` si vino, si no `oldEvent.equipment`; igual con `extraEquipment`.
  2. `loadConflictReport` sobre el equipo base → `validateResolutions`; con errores → 409 con `conflicts` recalculados.
  3. Por cada `replaceInOther`: `swapUnitInOtherEvent` (secuencial; acumular en `applied`); `ConflictChangedError` → 409 con `conflicts` recalculados + `applied`.
  4. Por cada `releaseOrphan`: `releaseStaleUse`.
  5. `applyLocalResolutions` con las unidades `toId` leídas de la base (con `PRICE_FIELDS`) → poner `body.equipment`, `body.extraEquipment`, `equipmentPrice = sumRentalPrice` y completar `body.date`/`body.endDate` desde `mergedForRange` para que corra el diff normal (`fullEquipmentBody` y `diffRuns` verdaderos).
  6. Seguir con el guard normal (debería pasar) y el guardado. Responder `applied` también en el 201.
  - Precios: para no-admin, `withRealEquipmentPrices` ya trae de la base los renglones nuevos; para admin, los renglones `replaceHere` ya vienen con precio de la base del paso 5 (no confiar en el body).

- [ ] **Step 4: `markNoticeSeen`.** Si viene: `$set` sobre `equipmentChangeNotices.$[n].seenAt` / `seenByName` (nombre: `context.user?.name`) con `arrayFilters: [{ 'n.id': markNoticeSeen }]`, en el mismo `findOneAndUpdate`.

- [ ] **Step 5: Verificar** — Run: `npx tsc --noEmit && npm test` · Expected: sin errores, todos PASS.

- [ ] **Step 6: Commit** — `git commit -m "feat: updateEvent devuelve los choques con candidatos y aplica las resoluciones en la misma request"`

---

### Task 4: Ventana de choques en la página del evento

**Files:**
- Create: `src/components/DateConflictModal/DateConflictModal.tsx`, `src/components/DateConflictModal/DateConflictProvider.tsx`
- Modify: `src/app/event/[id]/page.tsx` (`updateEventData` ×2 en :214 y :1980, `confirmArrival` :417, montar el proveedor en `EventPage` :2333), `src/components/EditableData/EditableData.tsx:61-95`

**Interfaces:**
- Consumes: contrato HTTP de Task 3; tipos de Task 1.
- Produces:
  ```ts
  // DateConflictProvider.tsx
  export function DateConflictProvider({ children }: { children: React.ReactNode }): JSX.Element
  export function useEventSave(): (body: { _id: string } & Record<string, any>) => Promise<{ ok: true; event: any } | { ok: false; error: string }>
  // fuera del proveedor, useEventSave hace el PUT simple (sin ventana)
  ```

- [ ] **Step 1: `useEventSave`**: PUT `/api/updateEvent`; si 409 con `conflicts`, abre la ventana con `{ conflicts, body }` y espera; "Guardar cambios" reenvía `{ ...body, conflictResolutions }`; si vuelve 409 con `conflicts`, refresca la ventana conservando las elecciones cuyo `equipmentId` y `toId` sigan siendo candidatos; "Cancelar" → `{ ok: false, error: 'Cancelado' }` sin notificación de error. Al éxito: `notify` con resumen de `applied` ("Se cambió CNSL-03 → CNSL-07 en Cumpleaños de 50; quedó un aviso en ese evento").

- [ ] **Step 2: `DateConflictModal`** (Mantine `Modal`, `fullScreen` en mobile con `useResponsive`):
  - Título: "Hay equipos ocupados en las fechas nuevas". Texto: cuántos equipos chocan.
  - Una tarjeta por equipo: nombre + código; "Ocupado por *<evento>* — <lugar> — <arDateTimeLabel inicio> a <fin>" (o "Reserva sobrante: el evento ya no existe / ya no tiene este equipo").
  - `Radio.Group`, opciones visibles solo si aplican, en este orden: "Usar otra unidad en este evento" (`Select` con `hereCandidates`; etiqueta con "· se usa ese día" y "· equivalente"), "Cambiar la unidad en *<otro evento>*" (`Select` con `otherCandidates`; si `otherEventInProgress`, `Alert` amarillo "Ese evento está en curso: la unidad probablemente ya está allá; hay que cambiarla físicamente"), "Tercerizar", "Quitar de este evento", "Liberar reserva sobrante".
  - Pre-elegida: `defaultResolution`. Una unidad elegida en una tarjeta queda deshabilitada en las demás.
  - "Guardar cambios" deshabilitado mientras falte decidir alguno; `loading` mientras aplica.

- [ ] **Step 3: Conectar.** `EventPage` envuelve su contenido en `DateConflictProvider`. Los dos `updateEventData` pasan a `useEventSave()` mandando **solo `{ _id, ...updates }`** (regla 10). `confirmArrival` usa `useEventSave()`. En `EditableData`, cuando `property` es `date`, `endDate`, `equipmentArrivalDate` o `equipmentArrivalTime` y no hay `onSave`, guardar con `useEventSave()` y `{ _id, [property]: value }`.

- [ ] **Step 4: Verificar** — Run: `npx tsc --noEmit && npx next lint --quiet` · Expected: sin errores. `getDiagnostics` de cada archivo tocado: sin errores.

- [ ] **Step 5: Commit** — `git commit -m "feat: ventana para resolver choques de equipos al cambiar fechas de un evento"`

---

### Task 5: Aviso en el otro evento

**Files:**
- Create: `src/components/EquipmentChangeNotice/EquipmentChangeNotice.tsx`
- Modify: `src/context/types.ts` (agregar `equipmentChangeNotices?: EquipmentChangeNotice[]` al modelo del evento), `src/app/event/[id]/page.tsx` (arriba de la página y en `EquipmentInformation` :1959), `src/components/DrawerContent/DrawerContent.tsx`

**Interfaces:**
- Consumes: `EquipmentChangeNotice` (Task 1); `useEventSave` (Task 4) para "Visto" con `{ _id, markNoticeSeen: id }`; `usePermissions().can('canEditEvents')`.
- Produces: `<EquipmentChangeNotice event={event} onEventUpdated={(e) => void} />` — recibe el evento por props (regla 10).

- [ ] **Step 1: Componente**: por cada aviso sin `seenAt`, `Alert` amarillo: "Se cambiaron equipos de este evento el <arDateTimeLabel(at)> (<byName>), al cambiar las fechas de *<fromEventName>*: CNSL-03 → CNSL-07. Si imprimiste la lista de equipos, volvé a imprimirla." Botón "Visto" solo con `canEditEvents`. Nada si no hay avisos sin ver.

- [ ] **Step 2: Montarlo** en la página (arriba y en la pestaña Equipamiento) y en el drawer. `getEvent` devuelve el documento completo: verificar que el campo llega (sin projection que lo excluya).

- [ ] **Step 3: Verificar** — Run: `npx tsc --noEmit && npx next lint --quiet && npm test` · Expected: sin errores.

- [ ] **Step 4: Commit** — `git commit -m "feat: aviso en el evento cuando le cambian equipos al resolver un choque"`

---

### Task 6: Verificación final (LEY de CLAUDE.md)

- [ ] **Step 1:** `npx tsc --noEmit`, `npx next lint --quiet`, `npm test`, `getDiagnostics` de todos los archivos tocados → sin errores.
- [ ] **Step 2:** Revisión independiente (subagente revisor, modelo más capaz) de todo el diff: reglas 1 (disponibilidad/reservas/historial), 2 (permisos, precios), 10 (cuerpos parciales, `selectedEvent`), 6 (requests).
- [ ] **Step 3:** Arreglar Crítico/Importante con test que falle primero.
- [ ] **Step 4:** `next build` si :3000 está libre (si no, pedírselo al usuario).
- [ ] **Step 5:** Prueba en QA (`MONGODB_DB=degano-app-qa`, confirmar antes): reproducir feria + cumple en QA, extender, resolver con cada opción, confirmar en la base QA (y que prod no cambió).
- [ ] **Step 6:** Actualizar CLAUDE.md (regla 1: choques al cambiar fechas) y la memoria.

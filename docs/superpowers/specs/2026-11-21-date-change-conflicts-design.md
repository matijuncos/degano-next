# Resolver choques de equipos al cambiar las fechas de un evento

Fecha: 21/11/2026 · Estado: aprobado por el usuario (21/11/2026)

## Por qué

Caso real: la Feria de Ciencias (Hotel Luz y Fuerza, 23→25/11) se extendió un día. Al cambiar la fecha de fin,
`updateEvent` devolvió 409 porque 2 equipos (TP-01, CNSL-03) estaban reservados el 26/11 por el "Cumpleaños de 50".
El chequeo es correcto (regla 1: nunca un equipo en dos eventos solapados), pero Juan quedó **trabado**:

- El cartel dice "elegí otra unidad", pero el selector de equipos del evento calcula disponibilidad con las fechas
  **guardadas** (sin el día extra), y las fechas nuevas no se pueden guardar mientras haya choque. Círculo cerrado.
- La única salida era ir al otro evento y cambiar las unidades a mano, sabiendo cuáles.

## Objetivo

Cuando un cambio de **rango de reserva** (inicio, fin, llegada del equipamiento o su confirmación) choca, en vez del
cartel rojo se abre una ventana con los equipos en conflicto y con qué evento chocan. Por cada uno se elige una
solución y se guarda **todo junto**.

Opciones por equipo, en este orden de preferencia (la ventana pre-elige la primera que exista):

1. **Otra unidad en este evento**: misma unidad/modelo (o equivalente de la misma categoría) libre en TODO el rango
   nuevo.
2. **Cambiar la unidad en el otro evento** ("de última"): el otro evento se queda con otra unidad libre en SU rango
   y este evento conserva la suya. Deja un **aviso** en el otro evento (ver abajo).
3. **Tercerizar** en este evento: se quita la unidad y se suma 1 al `extraEquipment` de ese modelo/categoría.
4. **Quitar** de este evento.

Al terminar: aviso de éxito con el resumen ("Se cambió CNSL-03 → CNSL-07 en Cumpleaños de 50; quedó un aviso").

### No-objetivos

- No cambia el flujo de **agregar equipos** (EquipmentList ya tiene su menú Reemplazar/tercerizar).
- No cambia Nuevo evento (ahí no hay reservas previas del propio evento; el selector ya usa las fechas del formulario).
- No mueve reservas automáticamente sin que el usuario confirme.

### Anti-objetivos (sería un fracaso aunque "funcione")

- Que quede un equipo en dos eventos solapados (el servidor revalida todo al aplicar).
- Que el otro evento cambie **sin dejar rastro visible** (alguien puede tener la lista impresa).
- Duplicar la lógica de reservas/historial/"En Evento" fuera de lo que ya usa `updateEvent`.
- Requests en cascada para abrir la ventana.

## Enfoques considerados

- **A. La pantalla orquesta** con lo existente (GET disponibilidad por cada rango + un `updateEvent` por evento).
  Descartado: cascada de requests y estado a medias si falla una.
- **B. Endpoint nuevo aparte** (consultar + aplicar). Descartado: duplica la sincronización de equipos de
  `updateEvent` (reservas, historial, En Evento).
- **C. Sobre el mismo `updateEvent`** ← **elegido por el usuario**. El 409 trae los datos estructurados con
  candidatos; se reenvía el mismo guardado con las decisiones; el servidor revalida y aplica todo en esa request.

## Diseño (decidido)

### Servidor

**409 con datos.** Cuando el chequeo de choques de `updateEvent` falla y el rango de la reserva cambió, la respuesta
sigue trayendo `error` (texto, para compatibilidad) y además `conflicts`:

```ts
conflicts: [{
  equipmentId, name, code, categoryId,
  busyWith: [{ eventId, eventName, eventType, location, startDate, endDate, stale: boolean /* evento inexistente o equipo ya no está en su lista */, otherEventEnded: boolean, otherEventInProgress: boolean }],
  hereCandidates:  [{ _id, name, code, sameDay, isEquivalent }],  // libres en el rango NUEVO de este evento
  otherCandidates: [{ _id, name, code, sameDay, isEquivalent }]   // libres en el rango del OTRO evento (solo si choca con 1 solo evento)
}]
```

- Candidatos con la lógica pura existente (`suggestReplacements` / `rankUnitsForEvent` / `equivalentModels` en
  `src/utils/equipmentSuggestions.ts`): mismo modelo primero, después equivalentes de la misma categoría; sin unidades
  ya en el evento correspondiente; sin dados de baja/en reparación.
- **Sin precios** en la respuesta (los precios los resuelve el servidor al aplicar, `withRealEquipmentPrices`).
- Una consulta extra al pool de equipos de las categorías involucradas + una a `events` para los otros eventos
  (`Promise.all`). Solo ocurre cuando hay choque.

**Aplicar.** El cliente reenvía el mismo cuerpo del guardado + `conflictResolutions`:

```ts
conflictResolutions: [
  | { equipmentId, action: 'replaceHere',    toId }
  | { equipmentId, action: 'replaceInOther', otherEventId, toId }
  | { equipmentId, action: 'outsource' }
  | { equipmentId, action: 'remove' }
  | { equipmentId, action: 'releaseOrphan', orphanEventId }   // ver "Decisiones tomadas en la revisión" (1)
]
```

Orden en el servidor:
1. Validar: cada resolución corresponde a un equipo que de verdad choca; `toId` libre en el rango que corresponde
   (revalidado contra la base en ese momento, no contra lo que vio la pantalla); sin `toId` repetidos; el otro
   evento existe y no terminó. Si algo no cierra → 409 con `conflicts` recalculados (la ventana se refresca).
2. `replaceInOther`: por cada una, función de `lib/` (`swapEventUnit(db, otherEventId, fromId, toId, ctx)`):
   - cambia el renglón en `events.equipment` del otro evento (precio real del equipo nuevo + `equipmentPrice` recalculado),
   - pasa la reserva de ese evento de `fromId` a `toId` (dos pasos, nunca `$pull`+`$push` del mismo array en un
     update), con estado "En Evento" / liberación igual que `updateEvent` si el otro evento está en curso,
   - historial: `uso_evento` en `toId`, `cambio_estado`/liberación en `fromId` (con `createHistoryEntries`),
   - agrega el **aviso** al otro evento.
3. `replaceHere` / `outsource` / `remove`: se transforman en el cuerpo del guardado (equipo y `extraEquipment`) con
   una función pura; si el cuerpo era parcial (ej. solo `endDate`), se completa con `equipment`/`extraEquipment`
   guardados para que corra el diff normal de `updateEvent` (agregados/quitados/mantenidos con sus reservas e
   historial).
4. Chequeo de choques normal y guardado normal. Debería pasar; si no (alguien reservó entremedio), 409 con datos.

No es una transacción: si el paso 4 falla después del 2, los cambios en el otro evento quedan aplicados (son válidos
por sí solos) y la respuesta lo informa para que la ventana lo muestre.

**Permisos.** Igual que editar eventos (`canEditEvents`: admin y manager) para todo, incluido cambiar el otro evento.

### Aviso en el otro evento

Campo nuevo `events.equipmentChangeNotices[]`:
`{ id, at, byName, fromEventId, fromEventName, changes: [{ fromName, fromCode, toName, toCode }], seenAt?, seenByName? }`.

- Cartel amarillo en la página del evento (arriba y en la pestaña Equipamiento) y en el drawer del calendario:
  "Se cambiaron equipos de este evento el 21/11 por Juan, al extender *Feria de Ciencias*: CNSL-03 → CNSL-07.
  Si imprimiste la lista, volvé a imprimirla." Botón **"Visto"** (guarda `seenAt`/`seenByName`, cuerpo parcial
  `{ _id, ... }`; el cartel desaparece; el registro queda).
- Lo ven todos los que ven el evento (no tiene datos sensibles).
- Projections: `getEvent` lo devuelve; `getEvents` solo si hace falta para un indicador (decisión del builder).

### Pantalla

- Un único lugar intercepta el 409 con `conflicts` en los guardados de fechas de la página del evento
  (`updateEventData` en `src/app/event/[id]/page.tsx`, el guardado genérico de `EditableData` con fechas y la
  confirmación de llegada). La forma (hook + modal compartido, o proveedor a nivel página) la decide el builder.
- Ventana: lista por equipo → con qué evento choca (nombre, lugar, fechas) → opciones (radio) con la pre-elegida;
  en "otra unidad" un selector con candidatos (marcando "se usa ese día" y "equivalente"). Botón "Guardar cambios"
  deshabilitado mientras falte decidir alguno. Mientras aplica: loader; si vuelve 409, se refresca con los nuevos
  datos.
- Mobile 390px: una tarjeta por equipo, opciones apiladas.
- Abrir la ventana: 0 requests (los datos vienen en el 409). Aplicar: 1 request.
- De paso, los guardados de fechas de la página mandan **solo `_id` + lo que cambia** (hoy `updateEventData` manda
  `{ ...selectedEvent, ... }`, contra la regla 10).

### Integración con lo existente

- Dónde se edita el rango: página del evento (fecha/hora inicio y fin, llegada, confirmación de llegada, bloque de
  datos de abajo). Drawer: verificar si edita fechas.
- Borrador de Nuevo evento: no aplica.
- Dónde se muestra el aviso: página del evento, drawer. PDFs: no (el aviso es para que reimpriman).
- Permisos/ofuscación: sin precios en el 409; precios reales al aplicar para no-admin.
- Projections: `equipmentChangeNotices` en `getEvent`.
- Datos viejos: campo opcional, sin migración.
- Alquileres: funciona igual (tienen equipos y reservas).
- Performance: 0 requests al abrir, 1 al aplicar; el cálculo de candidatos solo en el camino de error.

### Tests (lógica pura, Vitest)

- Armado de `conflicts` con candidatos (aquí / en el otro evento, equivalentes, sin repetidos, sin dados de baja).
- Transformación del cuerpo según `replaceHere`/`outsource`/`remove` (incluido cuerpo parcial).
- Validación de resoluciones (toId ocupado, repetido, equipo que no choca, otro evento terminado).
- Construcción del aviso.

## Decisiones tomadas en la revisión (decisión de Claude, a validar)

1. **Reserva sobrante** (aprobado por el usuario): una reserva cuyo evento **no existe** en `events`, **o existe pero
   ese equipo ya no está en su `equipment`**. Queda cuando un borrado/edición se corta a la mitad (`deleteEvent` borra
   el evento antes de liberar; `updateEvent` guarda antes de quitar reservas: ese orden es el seguro). Se ofrece la
   acción **"Liberar reserva sobrante"** (`action: 'releaseOrphan'`), que saca ese `scheduledUse` del equipo con
   entrada `cambio_estado` en el historial. Este evento conserva la unidad. Es la opción pre-elegida en ese caso.
   Un evento "terminado" no puede chocar con un rango futuro; si el rango nuevo empieza en el pasado, se trata como
   cualquier otro evento (sin opción 2 si ya terminó).
2. **Precio (decisión del usuario):** el cambio de unidad **sí afecta el precio**, en este evento y en el otro. El
   renglón toma los campos de precio reales del equipo nuevo (`PRICE_FIELDS`, desde la base, nunca del cliente) y se
   recalcula `equipmentPrice` con `sumRentalPrice`. Vale aunque lo haga un manager (no ve el precio, pero el cambio
   queda bien). El aviso NO muestra precios. `payment.totalToPay` (cargado a mano) no se toca.
3. **Botón "Visto":** solo para quien puede editar eventos (`canEditEvents`), por `updateEvent` con cuerpo parcial.
   Viewer ve el aviso, sin botón. Sin endpoint nuevo.
4. **Guardado que cambia fechas y además agrega equipos:** si cambió el rango, TODOS los equipos que chocan (viejos y
   recién agregados) van a la ventana. Si no cambió el rango, sigue el 409 de siempre.
5. **Otro evento en curso:** se permite la opción 2 con un aviso en la ventana ("Ese evento está en curso: la unidad
   probablemente ya está allá; hay que cambiarla físicamente"). Nunca es la pre-elegida.
6. **Tercerizar** suma 1 (cada renglón de `events.equipment` es una unidad).

## Queda para el builder

- Estructura exacta del hook/modal y dónde se monta.
- Nombres de archivos y de funciones nuevas.
- Si `getEvents` necesita algún indicador del aviso.
- Texto final de los carteles (en español, tono de la app).

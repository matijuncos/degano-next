# Cobros de STAFF — Diseño

Fecha: 2026-10-01 · Estado: aprobado para planificar

## Objetivo

Reemplazar la planilla quincenal con la que Juan liquida al personal. La app arma
sola, por empleado, la lista de eventos trabajados (fecha, rol, horas). Juan carga
el monto de cada uno, suma extras, registra adelantos y pagos, y siempre ve el
pendiente. Cada empleado ve lo suyo. Además, cada empleado tiene su póliza de
seguro en PDF.

## Decisiones tomadas (con el cliente)

| Tema | Decisión |
|---|---|
| Monto | **Manual por evento** (por empleado). Lo automático son los totales. |
| Horas | Informativas: llegada del staff (`staffArrivalDate` + `staffArrivalTime`) → `endDate`. Sin llegada cargada → `date` del evento. |
| Rol | El cargado en `event.staff[].rol`; vacío → "Sin rol". No cambia el tab STAFF. |
| Modelo | **Cuenta corriente** con imputación automática (enfoque A). No hay "cierres" formales. |
| Pagos | Juan registra cuándo y cuánto (total o parcial). La fecha la maneja él, no el sistema. |
| Adelantos | Restan del saldo, sin importar a qué período corresponden. |
| Forma de pago | `efectivo` · `transferencia_tercero` · `transferencia_degano` |
| Quién carga | **Solo admin** (regla "Pagos = solo admin"). |
| Empleado | Ve "Mis cobros" solo si su email de Auth0 está vinculado a un registro de STAFF (`resolveEmployee`). Cualquier rol (viewer/manager/admin). |
| Ventana empleado | Historial de 3 meses hacia atrás + 1 mes hacia adelante. **Recortado en el servidor.** |
| Admin | Historial completo, total futuro, totales mes a mes por empleado. |
| Póliza | PDF en S3. Sube/borra solo admin. Cada empleado ve solo la suya. |
| Cambios posteriores | Lo pagado no se toca: si cambia un monto, la diferencia queda pendiente sola. Si sacan al empleado del evento, la línea con monto queda marcada "ya no está asignado" y Juan decide. |
| Sin monto | Se muestran como "sin monto" y los totales avisan "N eventos sin monto". |

## Modelo de datos

### Colección nueva `staff_ledger`

Un documento por movimiento:

```ts
type LedgerType = 'evento' | 'extra' | 'pago' | 'adelanto';
type PaymentMethod = 'efectivo' | 'transferencia_tercero' | 'transferencia_degano';

interface LedgerEntry {
  _id: ObjectId;
  employeeId: string;        // _id del empleado (regla 4: nunca el sub de Auth0)
  type: LedgerType;
  date: Date;                // evento: date del evento · extra/pago/adelanto: la que carga Juan
  amount: number;            // > 0 siempre; el tipo define si suma o resta
  eventId?: string;          // solo 'evento'
  description?: string;      // extra: "Depósito"…; pago/adelanto: nota opcional
  hours?: number;            // extra: opcional
  method?: PaymentMethod;    // pago/adelanto: obligatorio
  createdBy: string;         // email del admin
  createdAt: Date;
  updatedAt: Date;
}
```

- **Cargos** = `evento` + `extra`. **Abonos** = `pago` + `adelanto` (idéntico cálculo, distinta etiqueta).
- Una línea `evento` se guarda **solo cuando Juan carga el monto**. Borrar el monto
  (campo vacío) borra el documento. Índice único parcial
  `{ employeeId: 1, eventId: 1 }` donde `type: 'evento'`.
- Índices: `{ employeeId: 1, date: 1 }`; en `events`, `{ 'staff.employeeId': 1 }`.
- `date` de una línea `evento` se refresca desde el evento al leer (si el evento
  cambió de fecha, manda el evento).

### Líneas derivadas (no se guardan)

Al leer la cuenta de un empleado se buscan los eventos con
`staff.employeeId = id` (proyección mínima: `_id, type, date, endDate,
staffArrivalDate, staffArrivalTime, staff, lugar/nombre para mostrar`) y se
combinan con las líneas `evento` guardadas:

| Caso | Resultado |
|---|---|
| Asignado + línea guardada | cargo con monto |
| Asignado + sin línea | cargo **sin monto** (no suma, se cuenta en "N sin monto") |
| Línea guardada + ya no asignado | cargo con monto + marca `unassigned` |
| Línea guardada + evento eliminado | cargo con monto + marca `eventDeleted` (usa la `date` guardada) |

### Póliza

En `employees`: `insurancePolicy?: { key: string; fileName: string; uploadedAt: Date }`.
**Se excluye de la proyección pública** de `GET /api/employees` (igual que `authSub`).
Archivo en el bucket `budgets`, carpeta `staff-policies/`, subido con presigned PUT
(`/api/uploadToS3`), nunca por body.

## Lógica pura — `src/utils/staffLedger.ts` (+ `staffLedger.test.ts`)

Toda la cuenta se calcula con funciones puras, testeadas con Vitest, que usan
tanto el endpoint admin como el del empleado:

- `computeStaffHours(event)` → número de horas o `null` si faltan datos.
- `buildCharges(employeeId, events, storedEventLines, extras)` → lista de cargos
  con `{ key, kind, date, amount|null, eventId?, eventName, rol, hours, unassigned?, eventDeleted? }`.
- `allocate(charges, credits)` → imputación **FIFO por fecha** (desempate por
  `createdAt`): los abonos cubren los cargos más viejos primero. Los cargos sin
  monto no participan. Cada cargo queda `pagado | parcial | pendiente` con
  `paidAmount`. Si los abonos superan los cargos, queda **saldo a favor**.
- `summarize(allocated, credits, now)` →
  - `pendingToDate`: impago de cargos con `date <= now`
  - `balance`: cargos − abonos (negativo = a favor)
  - `futureTotal`: cargos con `date > now`
  - `nextMonthTotal`: cargos con `now < date <= now + 1 mes`
  - `missingAmountCount` (total y en el próximo mes)
  - `byMonth`: `{ 'YYYY-MM': { charged, paid } }`
- `pendingUpTo(allocated, date)` → para precargar "pagar hasta tal fecha".
- `employeeWindow(now)` → `[now − 3 meses, now + 1 mes]`.

La imputación se calcula siempre sobre **toda** la historia (si no, el estado de
cada línea sería incorrecto) y **después** se recorta para el empleado.

## API

Todas siguen las convenciones: `withAuth` y variantes, `NextResponse.json`,
validar existencia de campos (bodies parciales), `Promise.all` para consultas
independientes, identidad resuelta una sola vez por request.

| Método y ruta | Quién | Qué hace |
|---|---|---|
| `GET /api/staffLedger` | admin | Resumen de **todos** los empleados de STAFF: `pendingToDate`, `balance`, `futureTotal`, `missingAmountCount`. Una sola request para la lista. |
| `GET /api/staffLedger?employeeId=` | admin | Cuenta completa: cargos imputados, abonos, `summary`, `byMonth`, info de póliza. |
| `POST /api/staffLedger` | admin | Crea `extra` / `pago` / `adelanto`. Para `evento`: **upsert** por `(employeeId, eventId)`; `amount` vacío → borra la línea. Valida tipo, monto > 0, método en abonos, y que el empleado (y el evento, si es nuevo) existan. |
| `PUT /api/staffLedger` | admin | Edita un movimiento existente (solo los campos presentes). |
| `DELETE /api/staffLedger?id=` | admin | Borra un movimiento. |
| `GET /api/staffLedger/me` | cualquier logueado | Resuelve el empleado con `resolveEmployee`. `not_linked`/`ambiguous` → respuesta con `reason`, sin datos. Si está vinculado: cuenta recortada a `employeeWindow`, `pendingToDate`, `balance`, `nextMonthTotal`, `missingAmountCount` del próximo mes. **Nunca** `futureTotal` ni nada fuera de la ventana. Incluye `hasPolicy` + `fileName`. |
| `POST /api/staffPolicy` | admin | `{ employeeId, key, fileName }` después del presigned PUT. Reemplaza la anterior. |
| `GET /api/staffPolicy?employeeId=` | admin o el propio empleado | Devuelve URL firmada (60 s) para ver/descargar. Otro empleado → 404. |
| `DELETE /api/staffPolicy?employeeId=` | admin | Quita la póliza (campo + objeto S3). |

No se modifican `postEvent` / `updateEvent` / `deleteEvent`: las líneas se
derivan al leer, así que asignar o quitar staff se refleja solo.

## UI

### Admin — página nueva `/cobros-staff`

Acceso: tile en Home + link en NavBar, **solo admin** (`can('canEditPayments')`).
Layout como `/staff`: lista a la izquierda, detalle a la derecha; tabs en mobile.

**Lista de empleados** (`GET /api/staffLedger`): nombre, pendiente a hoy
(resaltado en color si > 0), a favor si corresponde, badge "N sin monto".
Orden: más pendiente primero, después alfabético (`sortByName`).

**Detalle** (`GET /api/staffLedger?employeeId=`):
- Cabecera con totales: **Pendiente a hoy** (color de alerta), Saldo / A favor,
  **Total futuro**, "N eventos sin monto".
- Botones: **Registrar pago** (modal: tipo pago/adelanto, fecha, "pagar hasta"
  que precarga el monto con `pendingUpTo`, monto editable, método, nota) y
  **Agregar extra** (fecha, descripción, horas opcionales, monto).
- Tabla agrupada por mes (más nuevo arriba) con subtotal del mes (lo que generó):
  fecha · concepto (evento o extra) · rol · horas · monto · estado.
  - Monto de evento: `NumberInput` en la fila; guarda al salir del campo
    (mutate optimista, revierte y avisa si `!res.ok`).
  - Estado: pagado (verde) · parcial (amarillo) · pendiente (rojo/naranja) ·
    futuro (gris) · sin monto (punteado) · "ya no está asignado" / "evento eliminado" (aviso).
  - Abonos en la misma tabla, en otra tonalidad, con método. Editar/borrar con confirmación.
- Póliza: ver / subir / reemplazar / quitar.

### Empleado — página nueva `/mis-cobros`

Acceso: link en NavBar y tile en Home **solo si `useMyEmployee()` trae empleado**.
Si no está vinculado, la página muestra `RESOLVE_MESSAGES[reason]`.

- Cabecera: **Pendiente de cobro**, saldo a favor si hay, **Estimado próximo mes**
  + "N eventos sin monto".
- Misma tabla, solo lectura, recortada a la ventana (3 meses atrás, 1 adelante).
  Los "sin monto" se ven como "a definir".
- Botón **Ver mi póliza** si `hasPolicy`.

### STAFF existente

Sin cambios funcionales salvo excluir `insurancePolicy` de la proyección pública.

## Performance (regla 6)

| Vista | Requests | Mientras carga |
|---|---|---|
| `/cobros-staff` | 1 (resumen) al montar + 1 por empleado elegido (lista liviana, detalle al clickear) | Skeleton en lista y detalle; nunca "No hay…" antes de la respuesta |
| Guardar monto / pago / extra | 1 por acción; la respuesta devuelve la cuenta recalculada → `mutate(key, data, { revalidate: false })` + actualización del resumen | Fila con indicador de guardado |
| `/mis-cobros` | 1 | Skeleton |
| Ver póliza | 1 (URL firmada) | Botón en loading |

SWR con `revalidateOnFocus: false`. En el servidor, eventos y movimientos se
consultan en paralelo (`Promise.all`) con proyecciones mínimas. El resumen de
todos los empleados se calcula con 2 consultas (todos los movimientos + todos
los eventos con staff, proyectados), no con N consultas.

## Seguridad

- Endpoints de plata: `withAdminAuth`. `/me` devuelve solo lo del empleado
  resuelto; nunca acepta un `employeeId` del cliente.
- Ventana del empleado aplicada en el servidor.
- Póliza: `insurancePolicy.key` nunca sale en `GET /api/employees`; la URL
  firmada se emite solo al admin o al dueño.
- Montos: validar número finito y redondear a 2 decimales. `evento` admite 0 ("no se paga"); extra, pago y adelanto exigen > 0.

## Testing

- Vitest sobre `staffLedger.ts`: horas (con/sin llegada, cruce de medianoche),
  combinación de líneas (los 4 casos), FIFO (pago exacto, parcial, adelanto que
  excede, cargos sin monto ignorados, desempate), resumen (pendiente vs futuro,
  ventana de próximo mes, `byMonth`), `pendingUpTo`, `employeeWindow`.
- `npx tsc --noEmit` y `next build`.
- Prueba manual en el navegador: admin carga montos/pagos; usuario vinculado ve
  su ventana; usuario no vinculado ve el mensaje; manager/viewer reciben 403 en
  los endpoints admin.

## Fuera de alcance

Tarifas automáticas por rol u hora, roles distintos por evento, cierres formales
de período, recibos PDF de pago, avisos de vencimiento de póliza, exportar a Excel.

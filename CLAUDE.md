# Degano Next - Reglas del Proyecto

App de gestión de eventos (catering, shows, bodas, fiestas) para la empresa Degano. Construida con Next.js App Router, MongoDB, Auth0, Mantine UI.

## Stack Técnico

- **Framework:** Next.js 14 (App Router) con TypeScript
- **UI:** Mantine v8 + Tabler Icons + Framer Motion
- **Base de datos:** MongoDB (colección principal: `degano-app`)
- **Auth:** Auth0 (`@auth0/nextjs-auth0`)
- **State:** SWR para data fetching, React Context (`DeganoContext`) para estado global
- **Storage:** AWS S3 (equipamiento, bandas, presupuestos), Google Drive (archivos de eventos)
- **PDF:** html2canvas + jsPDF, @react-pdf/renderer
- **Path alias:** `@/*` → `/src/*`

## Idioma

- El código (variables, funciones, tipos) está en **inglés**
- Los comentarios, strings de UI, labels y mensajes al usuario están en **español**
- Los commits están en **español**

---

## REGLAS CRÍTICAS DE NEGOCIO

### 1. Equipamiento - Disponibilidad y Stock (CRÍTICO)

La disponibilidad de equipamiento se determina **exclusivamente por fechas**. El campo `scheduledUses` es la fuente de verdad.

**Flujo de disponibilidad:**
- Cada equipo tiene un array `scheduledUses: [{ eventId, eventName, eventType, startDate, endDate, location }]`
- Al consultar equipamiento para un evento (con `eventStartDate` y `eventEndDate`), se verifica solapamiento de fechas contra `scheduledUses`
- Si hay solapamiento → equipo marcado "En Evento" (no disponible)
- Si NO hay solapamiento → equipo disponible, **sin importar su estado actual en la DB**
- El campo `outOfService.reason === 'En Evento'` en la DB refleja el estado ACTUAL, no el futuro

**Rango de la reserva = desde la LLEGADA DEL EQUIPAMIENTO hasta el fin del evento** (`/src/utils/reservationRange.ts`, testeada): `reservationStart(ev)` usa `equipmentArrivalDate` + `equipmentArrivalTime` (hora AR; sin hora = 00:00) si es antes del inicio; si no, el inicio del evento. Lo usan `postEvent`/`updateEvent` (reservas y choques), la disponibilidad al elegir equipos (`reservationStartIso`) y la marca automática "En Evento".
- **Llegada > 3 días antes (`MAX_ARRIVAL_LEAD_DAYS`):** aviso + confirmación (`ArrivalLeadWarning`, en Nuevo evento y en la página del evento). Se guarda `equipmentArrivalConfirmedFor` = `arrivalConfirmKey` (llegada|inicio): si cambia alguna de las dos fechas, deja de valer sola. Sin confirmar, la reserva arranca con el evento (protege de errores de tipeo).
- `updateEvent` recalcula el rango aunque el cuerpo sea parcial (ej. solo la llegada o la confirmación): valida choques con los equipos guardados (409) y actualiza las reservas de ese evento.
- **Aviso de eventos pegados (`NEAR_EVENT_HOURS` = 6):** al elegir equipos, si otro evento termina/empieza a menos de 6 h de la reserva (sin superponerse), aviso amarillo por equipo + resumen. **No bloquea.** Viene en la misma disponibilidad (`nearWith`, no se guarda en el evento).
- Datos viejos: `scripts/migrate-arrival-reservations.ts --db=<base>` (simulación; `--apply`), no toca eventos con choques ni sin confirmar. Aplicado en prod el 15/11/2026 (26 eventos, 1679 reservas, sin borrar nada).
- **Sugerencia de llegada (Nuevo evento):** staff y equipamiento se completan con el día del evento, 2 h antes del inicio (`/src/utils/arrivalSuggestion.ts`, testeada). Se actualiza sola si cambia el horario del evento mientras siga con el valor sugerido; si la cambian a mano no se toca; si no la tocan, queda ese valor.

**Visualizador de disponibilidad** (Equipamiento → botón "Disponibilidad", `AvailabilityModal`): rango de días completos (00:00 → 23:59 AR, `rangeFromDays`) + categoría + buscador; usa la MISMA disponibilidad por fechas que al cargar un evento (`GET /api/equipment?eventStartDate&eventEndDate`) y la resume por equipo (`summarizeAvailability` en `/src/utils/availabilityView.ts`, testeada): total / disponibles / ocupados (con en qué eventos) / fuera de servicio. 1 request por rango; cambiar categoría o buscar = 0 requests. En celular, columnas compactas.

**NUNCA:**
- Determinar disponibilidad por `location` o por el estado `outOfService` de la DB cuando hay fechas de evento en la query
- Permitir que un equipo se asigne a dos eventos con fechas solapadas
- Modificar `scheduledUses` sin actualizar el historial
- Guardar una **categoría** como equipo de un evento: la UI entra en la subcategoría al tocarla y `postEvent`/`updateEvent` descartan esos renglones (`withoutCategoryItems`, `/src/utils/categoryItemGuard.ts`)

**Limpieza automática (GET /api/equipment sin fechas, `/src/lib/equipmentCleanup.ts`):**
- Se limpian `scheduledUses` expirados (endDate < now)
- **Reserva que EMPEZÓ → el equipo pasa a "En Evento"** con la ubicación, `lastUsed*` y detalle de ese evento (`pickActivations`), igual que `postEvent` con un evento de hoy. Así un evento cargado con anticipación muestra sus equipos "En Uso" mientras ocurre. Nunca pisa una baja manual (reparación, etc.); si ya figura con ese evento no se toca; si figura "En Evento" de otro evento viejo, se actualiza. Historial `cambio_estado`.
- Se liberan (location "Deposito", outOfService limpio, historial `cambio_estado`) los "En Evento" que `pickReleasable` (`/src/utils/equipmentRelease.ts`, testeada) da por seguros: sin uso en curso, sin uso de hoy pendiente, último uso con fecha y ya terminado, y que no figuren en ningún evento real en curso o de hoy (`liveEventEquipmentIds`). Un evento de MAÑANA no lo deja "En Uso" hoy: hoy está disponible y la limpieza lo marca cuando su reserva empieza.
- "¿Dónde está en uso?" (vista general) muestra la reserva en curso; si no hay, la de hoy que no empezó; si no, la próxima (`busyUsesForDisplay`, con cartel En curso / Empieza hoy / Próxima reserva). Un "En Uso" nunca queda sin explicar.
- **Se muestra el DATO REAL: las reservas por fechas** (pedido del usuario, 16/11/2026: nada de "ante la duda, ocupado"). Solo si el dato no alcanza para decidir (equipo marcado "En uso" a mano sin evento, o fechas rotas) se respeta lo que está cargado en la base, que también es dato real. El visualizador de disponibilidad usa solo las reservas.
- Se **espera** (`await`) y va en lote (un `updateMany` + historial con `createHistoryEntries`). Mira TODOS los "En Evento", no solo los de esa pasada: si algo se corta, la próxima lo completa. (Antes corría en segundo plano, se cortaba en eventos grandes y dejó 298 equipos trabados "En Evento".)
- Esta limpieza NO se ejecuta en modo evento (cuando hay fechas en la query)

**Al crear evento (`postEvent`):**
1. Se agrega `scheduledUse` a todos los equipos asignados
2. Si el evento es HOY o pasado → se actualiza `outOfService`, `location`, `lastUsedStartDate/EndDate`
3. Si es futuro → solo se agrega el `scheduledUse` (el equipo sigue disponible hasta la fecha; cuando la reserva empieza, la limpieza automática lo marca "En Evento")

**Al editar evento (`updateEvent`):**
1. Detectar equipos agregados/removidos comparando arrays
2. Equipos agregados → agregar `scheduledUse`
3. Equipos removidos → quitar `scheduledUse`, limpiar estado si no tiene otros usos activos
4. Si cambian fechas → actualizar fechas en todos los `scheduledUses` del evento

**Al eliminar evento (`deleteEvent`):**
1. Quitar `scheduledUse` de todos los equipos del evento
2. Si el equipo no tiene otros usos activos → resetear a "Deposito" y limpiar `outOfService`
3. Registrar en historial

### 2. Sistema de Permisos (CRÍTICO)

Tres roles: `admin`, `manager`, `viewer`. Definidos en `/src/types/auth.ts`.

| Acción | Admin | Manager | Viewer |
|---|---|---|---|
| Crear eventos | ✅ | ✅ | ❌ |
| Editar eventos | ✅ | ✅ | ❌ |
| Eliminar eventos | ✅ | ❌ | ❌ |
| Ver teléfonos clientes | ✅ | ❌ | ❌ |
| Ver teléfonos shows | ✅ | ✅ | ❌ |
| Ver precios/pagos | ✅ | ❌ | ❌ |
| Crear equipamiento | ✅ | ✅ | ❌ |
| Ver Disponibilidad de equipos por fechas (`canViewAvailability`) | ✅ | ✅ | ❌ |
| Crear bandas/shows | ✅ | ❌ | ❌ |
| Crear empleados/salones | ✅ | ❌ | ❌ |
| Crear/editar/borrar pagos, adelantos, presupuestos | ✅ | ❌ | ❌ |
| Crear/editar/borrar calendarios y sus eventos | ✅ | ❌ | ❌ |
| Ver calendarios compartidos (solo lectura) | ✅ | ✅ | ✅ |
| Crear tableros y tareas | ✅ | ✅ | ✅ |
| Definir visibilidad de tableros | ✅ | ❌ | ❌ |
| Eliminar tableros | ✅ | ❌ | ❌ |
| Cargar montos, extras, pagos y adelantos de STAFF | ✅ | ❌ | ❌ |
| Ver sus propios cobros (si está vinculado a STAFF) | ✅ | ✅ | ✅ |
| Subir/quitar póliza de seguro | ✅ | ❌ | ❌ |

**Pagos = SOLO admin, siempre.** Todo lo que sea plata (adelanto `upfrontAmount`, `subsequentPayments[]`, presupuestos/anexos) se gatea con `can('canEditPayments')`/`can('canDeletePayments')` en el front y `withAdminAuth()` en el back. NO extender a manager/viewer salvo pedido explícito del cliente.

**Reglas de ofuscación:**
- Teléfonos de clientes → `****` para manager y viewer
- Teléfonos de shows → `****` solo para viewer
- Precios de equipamiento → `****` para manager y viewer
- Pagos/presupuestos → ocultos completamente para manager y viewer

**Un valor ofuscado NUNCA se persiste.** `'****'` es solo para mostrar: si se guarda, pisa el teléfono real. Defensa en 2 capas, ambas obligatorias:
1. **UI:** el campo teléfono va `disabled` para quien no lo puede ver.
2. **Servidor:** `updateEvent` detecta valores ofuscados (`/^\*+$/`) y restaura el real desde el evento anterior o desde `clients`. Cualquier endpoint nuevo que reciba teléfonos tiene que hacer lo mismo.

**Implementación:**
- Backend: `withAuth()`, `withAdminAuth()`, `withManagerAuth()` en `/src/lib/withAuth.ts`
- Frontend: hook `usePermissions()` → `{ permissions, role, can(), isAdmin, isManager, isViewer }`
- Componente `ProtectedAction` para wrapping condicional de UI

### 3. Historial de Equipamiento

Toda acción sobre equipamiento se registra en la colección `equipmentHistory`. Acciones trackeadas:
- `creacion` - Equipamiento nuevo
- `edicion` - Cambios en campos
- `uso_evento` - Asignado/programado para un evento
- `traslado` - Cambio de ubicación
- `cambio_estado` - Disponible ↔ Fuera de servicio ↔ En Evento
- `nota` - Nota escrita a mano (bitácora; no se edita ni se borra)
- `eliminacion` - Equipo eliminado (foto de sus datos)

Usar utilidades de `/src/utils/equipmentHistoryUtils.ts`: `createHistoryEntry()`, `detectEquipmentChanges()`, `determineSpecialAction()`.

**El historial es PERMANENTE (CRÍTICO):**
- No se edita ni se borra, nunca. No hay endpoints de PUT/DELETE para `equipmentHistory` y no hay que crearlos.
- `POST /api/equipmentHistory` solo agrega **notas** (`action: 'nota'`, `note`, `authorName`) a la bitácora del equipo (`canEditEquipment`).
- El campo de texto viejo `equipment.history` quedó como "Notas anteriores" de **solo lectura**: el servidor lo ignora en POST/PUT de `/api/equipment`.
- Borrar un equipo registra `eliminacion` con una foto de sus datos (si no se puede registrar, NO se borra) y no se permite si tiene reservas que no terminaron (409). Su historial se sigue viendo desde Equipamiento → "Eliminados".
- Los cambios de precio del historial solo los ve el admin (`stripHistoryPrices`).
- Lógica pura en `/src/utils/equipmentLife.ts` (testeada): tipos importantes vs automáticos, filtros, resumen de vida, agrupado por mes.

### 4. Identidad: STAFF es el directorio único (CRÍTICO)

La colección `employees` (STAFF) es el directorio de personas de la app. **No hay colección de usuarios aparte** (la vieja `users` ya no se usa). El puente entre la cuenta de login (Auth0) y el registro de STAFF es el **email**.

- El email se guarda **normalizado** (`trim().toLowerCase()`) y es **único** (índice parcial `employees_email_unique`). La API rechaza duplicados con 409.
- `resolveEmployee(db, user)` (`/src/lib/resolveEmployee.ts`) resuelve el empleado del usuario logueado. **NUNCA adivina:** si no hay match o hay más de uno, corta (`not_linked` / `ambiguous`).
- Al entrar, `POST /api/me` (desde el NavBar) estampa `authSub`/`lastLoginAt`. Si el email no está en STAFF, crea una **entrada de directorio** (`isStaff: false`), que no aparece en la lista de STAFF ni en los selectores de personal. `GET /api/employees?directory=true` (solo admin) la incluye.
- Si después se carga ese email en un registro de STAFF, la entrada de directorio se fusiona: **se migran las referencias** (`boards`, `app_calendars`, `tasks`) al registro de STAFF antes de borrarla.
- Dueños, miembros y responsables se guardan con el **`_id` del empleado**, nunca con el `sub` de Auth0.
- `authSub` y `lastLoginAt` son internos: **no salen de la API**.

### 5. Visibilidad de tableros y calendarios (CRÍTICO)

**Calendarios extras** (`app_calendars`), campo `visibility`:
- `all` → todos los logueados (solo lectura para no-admin)
- `admins` → solo admins. **Un calendario sin `visibility` (legacy) se trata como `admins`.**
- `restricted` → dueño (`ownerId`) + empleados en `memberIds`. "Solo yo" = `restricted` con `memberIds: []`.

**Tableros** (`boards`): `all` (o sin `visibility`, legacy) = todos; `restricted` = dueño + `memberIds` (el dueño va siempre incluido en `memberIds`).

**Reglas:**
- **Privado es privado incluso para otros admins.** No hay excepción de rol.
- El filtro se aplica **en el servidor** (`visibleCalendarsFilter()` en `/src/utils/calendarVisibility.ts`), nunca solo en el front. Los eventos de un calendario se filtran por los calendarios visibles.
- **El control de acceso va en TODOS los métodos** (GET, POST, PUT, DELETE), no solo en el GET. Si el usuario no tiene acceso → 404.
- **Nunca dejar un recurso restringido sin dueño ni miembros:** nadie lo vería y no se podría editar ni borrar. Si no hay dueño resoluble → 400 con mensaje claro. Un recurso legacy sin dueño toma como dueño al admin que lo restringe.
- Al calcular el preset de visibilidad en la UI, el dueño **no cuenta** como "otro miembro".
- **Borrar un evento de calendario extra no pide confirmación, pero se puede deshacer:** el `DELETE` primero guarda una copia completa en la papelera `calendar_events_deleted` (si falla, no borra) y la UI muestra "Deshacer" durante 30 s (`UNDO_SECONDS`). `POST { action: 'restore', id }` lo vuelve a insertar con el **mismo `_id`** (se relinkean sus cobros). Lógica en `/src/utils/calendarTrash.ts`. La papelera **se limpia sola a los 15 días** (índice TTL `trash_ttl` sobre `deletedAt`, lo crea `ensureTrashIndex` al borrar; `TRASH_RETENTION_DAYS`). Recuperar algo borrado antes de eso: buscarlo en la papelera por `originalId`; más viejo, backup de S3. Los eventos de Degano NO tienen deshacer (tienen confirmación).

### 6. Performance OBLIGATORIA (CRÍTICO)

**Nada se implementa si no es performante.** La performance y los estados de carga se diseñan desde el principio, no se agregan cuando el usuario nota la lentitud. Cada request cuesta ~800ms-1s (Auth0 `getSession()` + MongoDB + cold start de Vercel), así que cada viaje de más se nota.

Checklist antes de dar algo por terminado:
1. **Nada de cascadas.** Si una vista necesita A y después B, van en un endpoint combinado (ej. `/api/calendarData`, `/api/boards?withTasks=1`) y se precarga la caché SWR del recurso hijo con `mutate(key, data, { revalidate: false })`.
2. **Precargar lo que se va a usar.** Lo que usa un modal o un selector se pide al montar la vista (`preload` de SWR), no al abrir el modal.
3. **Loaders siempre.** Toda vista o selector que depende de un fetch muestra un spinner/placeholder mientras `!data`. **Nunca mostrar un estado vacío** ("No hay…", "Sin…") antes de que llegue la respuesta.
4. **Mínimos viajes en el servidor.** `Promise.all` para consultas independientes; no resolver sesión/identidad más de una vez por request.
5. **SWR sin refetches innecesarios** (`revalidateOnFocus: false`, `dedupingInterval`) salvo que la vista necesite datos en vivo.
6. **Listas livianas, detalle completo al clickear** (ej. `/api/getEvents` liviano, `/api/getEvent?id=` completo).
7. **Ante un lag visual, revisar re-renders antes que CSS.** Para cambios solo cosméticos (resaltar una fila) actualizar el DOM directo en vez de un estado que re-renderiza toda la lista.
8. Al entregar una feature, decir cuántas requests hace y qué se muestra mientras carga.

### 7. Cobros de STAFF (CRÍTICO)

Cuenta corriente por empleado en `staff_ledger`. Lógica pura en `/src/utils/staffLedger.ts` (testeada).

- **Cargos** = `evento` (monto manual por evento) + `extra` + `fijo`. **Abonos** = `pago` + `adelanto`.
- **Calendarios que cuentan para cobros** (`app_calendars.staffPayable`, ej. Logística Técnica): sus eventos llevan `staff[]` (`{employeeId, employeeName, rol}`, igual que `events.staff`) y entran en la cuenta como eventos (`calendarEventToStaffEvent`, `source: 'calendar'`). La línea de monto guarda `source: 'calendar'`; monto y rol se guardan en `calendar_events`. Calendario sin `staffPayable` → el servidor no guarda staff.
- **Fijo mensual:** UN documento `type: 'fijo'` (`amount`, `dayOfMonth`, `fromMonth`, `toMonth?`, `rol?`); los meses se generan al leer (`fixedMonthDates`, hasta 1 mes adelante, nunca antes del inicio de cobros; día inexistente → último del mes). Clave de cada mes: `fijo:<id>:YYYY-MM`. "Cambiar monto desde un mes" = el viejo termina el mes anterior (`toMonth`) y se crea uno nuevo (`replacesId`); editar el fijo cambia TODOS sus meses.
- Las líneas de evento se **derivan** de `events.staff` al leer: solo se guarda el monto. No tocar `postEvent`/`updateEvent` para esto.
- Imputación: un abono hecho con el **tilde "Pagado"** de una línea (`chargeKey` = `evento:<id>` | `extra:<id>`) cubre esa línea aunque sea futura (estado "Adelantado"). El resto (pagos a cuenta + sobrantes) va **FIFO** solo a los cargos con fecha **hasta hoy**; lo que sobra es **saldo a favor** y cubre cada cargo futuro cuando llega su fecha. Destildar borra los abonos con ese `chargeKey`.
- Tipo automático: tilde en evento pasado/hoy → `pago`, futuro → `adelanto`. Pago a cuenta → `pago` si hay pendiente a hoy, si no `adelanto`.
- **Fecha de inicio de cobros: `LEDGER_START_DAY` = 1/10/2026.** Los eventos anteriores no entran (se pagaron por fuera); una línea con monto se muestra siempre. Filtrar `date` en Mongo por string ISO **y** por `Date` (hay eventos viejos con los dos tipos).
- Si sacan al empleado de un evento con monto, o se borra el evento, la línea queda marcada; nunca se borra sola.
- Todo es **solo admin**. El empleado ve `/mis-cobros` solo si `isStaff !== false`, con ventana **3 meses atrás hasta HOY recortada en el servidor** (`splitByToday`): **lo futuro NUNCA le llega** (decisión de Juan, 13/11/2026), ni renglones ni totales.
- **"Por venir" (admin):** lo de fecha posterior a hoy va **plegado** en una fila "Por venir" arriba de cada mes/quincena/tarjeta y **no suma** en Generado / Falta (se muestra aparte como "Por venir $X"). Mes o quincena todo futuro → plegado entero. "Tildar todo" / "Cerrar quincena" tildan solo lo que ya se debe (todo futuro → todo, para adelantar). Lógica en `splitGroup()`/`isFutureDay()` (`staffLedgerViews.ts`). Dentro de cada grupo, lo más nuevo arriba.
- **Vistas (`LedgerViews`):** Resumen de cuenta (por MES), Por quincena (1-15 / 16-fin) y Armar el pago (solo admin). Resumen de cuenta por defecto. Los pagos y pagos a cuenta van en su fecha en todas las vistas. El empleado ve solo Resumen y Quincena, en solo lectura. Encabezado: una cifra (saldo a pagar hoy / a favor) + total generado por mes.
- **Pagar varios renglones:** `POST { action: 'payLines', chargeKeys, amount, method, date }` → un abono por renglón (con su `chargeKey`, del más viejo al más nuevo) + lo que sobra como pago a cuenta, todos con el mismo `batchId` (se muestran como UN pago; `DELETE ?batchId=` lo deshace entero). La forma de calcular la cuenta NO cambió. Lógica pura en `/src/utils/staffLedgerViews.ts`.
- "Adelanto" no se muestra como tal: un abono sin `chargeKey` es **"Pago a cuenta"**; uno atado a renglones es **"Pago"**. El tipo pago/adelanto queda interno.
- Póliza: `employees.insurancePolicy` (excluida de `GET /api/employees`). Se ve por `/api/staffPolicy` (admin o el propio empleado).
- Fechas en hora argentina (UTC-03:00 fijo): usar `arDay()`/`inputDay()`, nunca `getDate()` en el servidor.

### 8. Roles de STAFF con monto (CRÍTICO)

Catálogo en `staff_roles` (`name`, `rates: [{amount, from: 'YYYY-MM-DD'}]`, `archived?`). Lógica pura en `/src/utils/staffRoles.ts` (testeada).

- En eventos, calendarios de cobros y perfiles cada persona lleva **`roleIds`** (uno o varios, del catálogo) + **`rol`** (texto para mostrar: nombres unidos con " / "). El monto sale de `roleIds`, nunca del texto.
- **Monto precargado** de una línea de evento en Cobros = suma de sus roles con el monto vigente **a la fecha del evento** (`rateAt`). Cuenta como deuda directa. Un monto cargado a mano gana; borrarlo vuelve al de los roles.
- **Al pagar con el tilde una línea con monto de los roles, ese monto se guarda en la línea** (`lockAmount`, solo si no había línea): lo pagado no cambia si después cambian los roles, y si sacan al empleado la línea queda marcada. Una línea de roles SIN pagar desaparece si sacan al empleado del evento (nadie cargó nada).
- Cambiar el monto de un rol = agregar un `rate` con fecha "desde" (nunca pisar el historial): los eventos anteriores no cambian. Montos iniciales desde `ROLE_RATES_START` = 21/10/2026.
- **Todo lo que es monto es solo admin**: `GET /api/staffRoles` devuelve solo nombres a manager/viewer; POST/PUT con `withAdminAuth`. `/mis-cobros` no recibe `roleAmount`.
- **Crear un rol desde el evento: solo admin.** El manager solo elige de la lista.
- Los roles no se borran: se archivan. Renombrar actualiza el `rol` de eventos, calendarios y perfiles.
- Fijo y Extra eligen el rol de la lista solo como nombre (su monto es el propio).
- Datos viejos: `scripts/migrate-staff-roles.js` (simulación por defecto, `--apply` para escribir).

### 9. Lugares (salones)

Panel en `/lugares`: lo **ven admin y manager**; **solo el admin modifica** (editar, crear, unir), en el front y en el servidor (`propagate` y `merge` → 403/admin). Lógica pura en `/src/utils/venues.ts` (testeada).

- Los eventos guardan el lugar **por nombre** (`lugar`) y una **copia** de sus datos (`eventAddress`, `eventCity`, `eventProvince`, `venueContactName`, `venueContactPhone`, `venueMapsUrl`).
- **Editar un lugar desde el panel actualiza los eventos de HOY EN ADELANTE** (día argentino; `PUT /api/salons` con `propagate: true`). Los pasados NO se tocan. Solo se copian los campos que cambiaron.
- Si cambia el nombre, también se actualiza `scheduledUses[].location` de los equipos de esos eventos (y `location` si están hoy en uno), con entrada `edicion` en `equipmentHistory`. El historial viejo no se toca.
- Unir duplicados (`POST action: 'merge'`): los eventos de hoy en adelante pasan al lugar que queda y se borra la ficha duplicada.
- El nombre se compara sin mayúsculas ni espacios de más (`venueNameFilter`). No puede haber dos lugares con el mismo nombre (409).
- El `PUT` sin `propagate` (lo usa el formulario de evento) sigue igual: solo actualiza la ficha.

---

### 10. El "evento seleccionado" es GLOBAL: nunca usarlo a ciegas (CRÍTICO)

`selectedEvent` (DeganoContext) es el **último evento que se abrió** en la app (calendario, lista, drawer), no necesariamente el que está en pantalla. Usarlo a ciegas hizo que, al crear un evento nuevo, la pestaña Archivos mostrara y **borrara archivos de OTRO evento** (incidente 04/11/2026).

- **Nuevo evento JAMÁS lee `selectedEvent`.** Todo componente que se use ahí recibe el evento del formulario por props (ej. `<FilesHandlerComponent event={event} onEventUpdated={...} />`). Los archivos se pueden subir ANTES de finalizar: van a la carpeta propia del formulario (`folderId` único) y quedan en el formulario/borrador; `postEvent` solo adjunta los de esa carpeta (`ownFiles`). Antes de crear, solo se puede borrar un archivo de esa carpeta (`fileInFolder`).
- **Página de un evento:** solo se muestra/edita cuando el seleccionado es el de la URL (`eventForPage(selectedEvent, id)` en `/src/utils/eventScope.ts`). Mientras carga → spinner, nunca el evento anterior.
- **Al guardar un evento, mandar SOLO `_id` + lo que cambia** (`filesUpdateBody`, `{ _id, staff }`, etc.). Nunca `{ ...selectedEvent, ... }`: una copia vieja en memoria pisa el resto del evento (o a otro evento). `updateEvent` acepta cuerpos parciales.
- **Borrar un archivo:** primero sacarlo del evento y recién después de S3 (si falla lo primero, el archivo no se pierde). El bucket `degano-events-files` tiene versionado: lo borrado se puede recuperar.
- Componente nuevo que use `useDeganoCtx().selectedEvent`: revisar en qué páginas se monta. Si puede aparecer en Nuevo evento, pasarle el evento por props.

### 11. Tipo de evento: Evento / Alquiler (CRÍTICO)

Degano alquila equipos a terceros. Campo `events.eventKind: 'evento' | 'alquiler'`; **sin campo = evento** (todos los viejos, sin migración). El tipo lo define SOLO `eventKind`, nunca el texto de "Tipo de evento" (`type`). Lógica pura en `/src/utils/eventKind.ts` (testeada).

- **Alquiler = evento completo** (stock con `scheduledUses`/solapamiento/historial, staff → Cobros, presupuesto) **sin Show, Música, Timing ni Archivos**: ni en Nuevo evento, ni en la página, ni en el drawer, ni en el PDF. Tampoco horarios de ceremonia (`churchDate`/`civil`): no se cargan, no se guardan (`stripRentalFields`) y "Agregar campos" no los sugiere.
- **Crear:** `/new-event` muestra primero la elección (`EventKindChooser`) si no hay borrador. En alquiler `type` se precarga con "Alquiler" (editable). Lugar/Localidad siguen obligatorios (crean ficha en `/lugares`). Mientras se crea se puede "Cambiar" (avisa y borra archivos ya subidos); **una vez creado queda fijo**.
- **Navegación de pestañas:** los formularios piden pestañas fijas; la página las traduce con `resolveTab()` (no tocar cada formulario). Borrador: `restoreTab()`.
- **Servidor:** `postEvent` normaliza `eventKind` y descarta los campos de alquiler (`stripRentalFields`, nunca `folderId`); `updateEvent` **nunca cambia `eventKind`** y en un alquiler descarta esos campos (`sanitizeKindUpdate`). `getEvents` proyecta `eventKind`.
- **Un alquiler no tiene `music`:** todo código nuevo que lea `event.music.x` va con `?.` o detrás de `!isRental(...)`.
- **Calendario:** cobre por estado (`rentalEventColors`; elegido para no parecerse a ningún calendario en uso, ej. el gris de Reuniones) + 🚚 en el título; tilde propio **"Alquileres"** en el sidebar, independiente de "Eventos" (cada uno los oculta en su pantalla; `rentalsHidden` en `calendarViewPrefs`, `showInternalEvent`). Los ven todos los roles con el mismo detalle por rol que un evento (teléfonos/precios/pagos según rol). Cartel `RentalBadge` en página, Nuevo evento, Próximos eventos y `/events`.

---

## Estructura del Proyecto

```
src/
├── app/                    # Páginas y API routes (App Router)
│   ├── api/                # Endpoints REST
│   │   ├── equipment/      # CRUD equipamiento (GET con lógica de disponibilidad)
│   │   ├── postEvent/      # Crear evento
│   │   ├── updateEvent/    # Editar evento
│   │   ├── deleteEvent/    # Eliminar evento
│   │   ├── getEvent/       # Obtener evento por ID
│   │   ├── getEvents/      # Listar eventos
│   │   ├── bands/          # CRUD bandas
│   │   ├── getClients/     # Listar clientes (con ofuscación)
│   │   ├── categories/     # Categorías de equipamiento
│   │   ├── employees/      # CRUD empleados
│   │   ├── salons/         # CRUD salones (?withUsage=1 para el panel; propagate/merge, ver regla 9)
│   │   ├── uploadToS3/     # Upload a AWS S3
│   │   ├── uploadToGoogleDrive/  # Upload a Google Drive
│   │   ├── me/             # Identidad del usuario logueado (vínculo con STAFF)
│   │   ├── appCalendars/   # CRUD calendarios extras (con visibilidad)
│   │   ├── calendarData/   # Calendarios + eventos visibles en una request
│   │   ├── calendarEvents/ # CRUD eventos de calendarios extras
│   │   ├── boards/         # CRUD tableros (?withTasks=1 trae tareas del primero)
│   │   ├── tasks/          # CRUD tareas de tableros
│   │   ├── staffLedger/    # Cobros de STAFF (admin) + /me (empleado)
│   │   ├── staffPolicy/    # Póliza de seguro (PDF S3)
│   │   ├── staffRoles/     # Catálogo de roles de STAFF con montos (admin) / nombres (resto)
│   │   └── ...
│   ├── new-event/          # Página crear evento (formulario 10 tabs)
│   ├── event/[id]/         # Página editar evento
│   ├── equipment/          # Gestión de equipamiento (3 paneles)
│   ├── equipment-stock/    # Stock de equipamiento
│   ├── calendar/           # Calendario de eventos + calendarios extras
│   ├── tableros/           # Comunicación interna (tableros tipo Trello)
│   ├── lugares/            # Panel de lugares (regla 9)
│   └── ...
├── components/             # Componentes React
│   ├── EventForm/          # Formulario de evento
│   ├── ClientForm/         # Formulario de cliente
│   ├── ShowForm/           # Formulario de shows/bandas
│   ├── EquipmentForm/      # Formulario de equipamiento
│   ├── PaymentForm/        # Formulario de pagos
│   ├── ContentPanel/       # Panel principal equipamiento
│   ├── TreeView/           # Árbol de categorías
│   ├── PrintableSections/  # Secciones PDF imprimibles
│   └── ...
├── context/
│   └── DeganoContext.tsx    # Estado global (eventos, auth, navegación)
├── hooks/                  # usePermissions, useGenres, useResponsive
├── lib/                    # mongodb.ts, withAuth.ts
├── types/                  # TypeScript types (auth.ts, etc.)
└── utils/                  # Utilidades (dateUtils, roleUtils, pdfUtils, etc.)
```

## Colecciones MongoDB

| Colección | Uso |
|---|---|
| `events` | Eventos con toda la info (cliente, equipamiento, bandas, pagos, etc.) |
| `equipment` | Equipamiento v2 con `scheduledUses`, `outOfService`, `location` |
| `equipmentHistory` | Log de cambios/uso de equipamiento |
| `equipmentLocation` | Ubicaciones posibles de equipamiento |
| `categories` | Categorías jerárquicas de equipamiento (parentId) |
| `bands` | Bandas/artistas con contactos y archivos |
| `clients` | Clientes con datos de contacto |
| `contacts` | Contactos genéricos |
| `employees` | STAFF + directorio de personas (email único, vínculo con el login). Ver regla 4 |
| `genres` | Géneros musicales |
| `salons` | Salones/venues |
| `app_calendars` | Calendarios extras con `visibility`/`ownerId`/`memberIds`. Ver regla 5 |
| `calendar_events` | Eventos de los calendarios extras (`calendarId`; `staff[]` con rol si el calendario tiene `staffPayable`) |
| `boards` | Tableros de Comunicación Interna con `visibility`/`ownerId`/`memberIds` |
| `tasks` | Tareas de los tableros (`boardId`, `status`, `order`, `assigneeId` = `_id` de empleado) |
| `staff_roles` | Roles de STAFF con historial de montos por evento (ver regla 8) |
| `staff_ledger` | Cuenta corriente de cobros de STAFF: montos por evento, extras, pagos y adelantos (ver regla 7) |

## Convenciones de Código

- **API routes:** Siempre wrappear con `withAuth()` o variantes. Retornar `NextResponse.json()`
- **Nunca reusar una `NextResponse` creada a nivel de módulo:** el body se lee una sola vez y la segunda request falla con 500. Usar una función (`const forbidden = () => NextResponse.json(...)`).
- **Front: `fetch` no tira error con 4xx/5xx.** Siempre validar `res.ok` y mostrar el mensaje de error real del servidor. Nunca notificar éxito sin chequearlo.
- **Projections:** al agregar un campo nuevo a una colección, actualizar las projections de las APIs que la sirven (`/api/getEvents`, `/api/calendarData`, `/api/categoryTreeData`, etc.) o el campo no llega al front.
- **Bodies parciales:** varios componentes mandan updates parciales (solo el campo que cambian). `updateEvent` y cualquier PUT nuevo tienen que chequear que los campos existan antes de procesarlos (ej. el diff de equipamiento solo corre si vienen `equipment`, `date` y `endDate`), y no borrar datos por ausencia de una clave.
- **MongoDB:** no usar `$set` y `$unset` sobre el mismo campo en un update (conflicto → error). Lo mismo con `$addToSet` + `$pull` sobre el mismo array: hacerlo en dos pasos.
- **Vercel Hobby:** body máximo 4.5MB, timeout 10s. Los archivos se suben directo del browser a S3 con presigned URLs, nunca por body a una API route.
- **Data fetching:** Usar SWR con `fetcher`. Invalidar caché con `mutate()` después de cambios
- **Formulario de eventos:** 10 tabs en orden: CLIENT → EVENT → SHOW → MUSIC → TIMING → MORE_INFO → EQUIPMENT → STAFF → FILES → PAYMENT. Alquiler: CLIENT → EVENT → MORE_INFO → EQUIPMENT → STAFF → PAYMENT (regla 11)
- **Componentes:** Funcionales con hooks. Mantine para toda la UI
- **Tema claro del calendario:** la app fuerza `forceColorScheme='dark'`, pero `/calendar` tiene su propio tema claro. Todo componente nuevo ahí (dropdowns, pills, botones deshabilitados, botones `subtle`) necesita estilos explícitos para el tema claro; si no, sale oscuro o apagado.
- **Equipamiento en eventos:** Siempre actualizar `scheduledUses` + historial al agregar/quitar/modificar
- **Archivos:** Equipamiento y bandas → S3. Archivos de eventos → Google Drive
- **S3 Buckets:** `degano-equipment-uploads`, `degano-bands`, `degano-budgets`

## Patrones Importantes

### Flujo de datos
```
API Route → SWR cache → DeganoContext → Componentes → Estado local
```

### Al modificar equipamiento, siempre:
1. Actualizar la DB
2. Actualizar `scheduledUses` si es relevante
3. Crear entrada en `equipmentHistory`
4. Invalidar caché SWR (`mutate`)

### Al modificar eventos, siempre:
1. Actualizar la DB
2. Sincronizar equipamiento (agregar/quitar `scheduledUses`)
3. Actualizar el contexto (`updateEventInList` o `addEventToList`)
4. Invalidar caché SWR

## Integración con lo existente (OBLIGATORIO)

Toda feature nueva se diseña **sobre lo que ya funciona**, no al lado. Antes de diseñar, buscar (grep) **todos** los lugares que leen, muestran o editan el dato que se toca y decidir qué pasa en cada uno. Checklist mínimo:
- **Dónde se carga/edita:** crear evento, editar evento, drawer del calendario, modales de calendarios extras, perfiles, cobros.
- **Borrador de Nuevo Evento** (`useEventDraft`): que el dato nuevo se guarde y se restaure.
- **Dónde se muestra:** listas, detalle, drawer, PDFs imprimibles, mis-cobros.
- **Permisos y ofuscación:** front + servidor (`sanitizeEventForRole`, `withAdminAuth`…), incluido lo que devuelve cada GET.
- **Projections** de las APIs que sirven la colección.
- **Datos viejos:** cómo quedan los registros existentes (migración con simulación primero, o compatibilidad al leer).
- **Mobile** (390px) y tema claro de `/calendar` si aplica.
- **Performance:** requests extra, precarga, loaders.

En el diseño, listar estos puntos de integración explícitamente para que el usuario los valide.

## Base de QA (pruebas en local)

- En el **mismo cluster** de Atlas que prod hay una base **`degano-app-qa`**: copia de `degano-app` que el usuario hace **a mano** (`mongodump --db=degano-app` → `mongorestore --db=degano-app-qa`). No usar `--nsFrom/--nsTo` ni scripts que copien entre bases: los nombres se parecen y un error pisa prod.
- La app elige la base con `MONGODB_DB` (`DB_NAME` en `@/lib/mongodb`, por defecto `degano-app`). En el `.env.local` del usuario: `MONGODB_DB=degano-app-qa` → **en local se puede escribir para probar** (crear eventos, pagos, etc.). En Vercel Production: `degano-app`.
- **Antes de escribir:** confirmar `MONGODB_DB` en `.env.local` y que el server que se usa la tomó (reiniciado después del cambio). Después, confirmar en la base que el cambio quedó en QA y NO en prod.
- **S3 es el mismo que prod:** en QA no borrar archivos de eventos (se borran de verdad).
- Los scripts de `scripts/` apuntan a `degano-app` (prod) a propósito.
- Pruebas en navegador (Playwright): si el usuario ya tiene un server en :3000, usar ESE (nunca levantar otro); si no hay, levantar uno y apagarlo al terminar.

## Verificación antes de dar algo por terminado

**LEY: nada va a prod sin revisión (pedido del usuario, 16/11/2026).** Después de escribir código nuevo, ANTES de darlo por terminado o de decir que está listo para deploy:
1. `npx tsc --noEmit`, `npx next lint --quiet`, `npm test` y diagnósticos del editor sin errores.
2. **Revisión independiente** (subagente revisor, modelo más capaz) de TODO lo nuevo desde la última revisión: bugs con escenario concreto, reglas de este archivo (sobre todo equipos/disponibilidad, permisos, cuerpos parciales, performance).
3. Arreglar lo Crítico/Importante con test que falle primero; lo menor se informa al usuario.
4. `next build` si :3000 está libre (si no, pedirle al usuario que lo corra con su server apagado).
5. Decir explícitamente qué se revisó, qué se arregló y qué quedó pendiente. Sin esto, NO se dice "listo para prod".


**JAMÁS dejar un archivo con errores (CRÍTICO).** Ningún archivo tocado puede quedar con errores, ni en `tsc` ni en el editor (VSCode). Un cambio no está terminado mientras haya un error en rojo:
- Después de editar, revisar los diagnósticos de cada archivo tocado (`getDiagnostics` del editor) además de `npx tsc --noEmit`. **Y correr `npx next lint --quiet`**: los errores de ESLint (reglas de hooks, comillas sin escapar en JSX…) NO los muestran ni `tsc` ni el editor, pero hacen fallar el build de Vercel (pasó el 15/11/2026). El editor usa un TypeScript más nuevo y marca cosas que `tsc` no (ej. imports de `.css` → declarados en `src/types/side-effect-imports.d.ts`).
- Si aparece un error (aunque sea de antes, en un archivo que toqué), se arregla antes de entregar. Nunca `@ts-ignore`/`any` para taparlo sin explicar por qué.
- Los avisos (warnings/hints) que ya estaban no bloquean, pero no se agregan nuevos.

- **Typecheck:** `npx tsc --noEmit` (sin pedir permiso).
- **Tests:** `npm test` (Vitest). Se testea **lógica de negocio pura** (`src/**/*.test.ts`, al lado del código). Para testear algo de un componente o endpoint, primero extraerlo a una función pura y que producción use esa misma función.
- Cambios grandes o antes de un deploy: `next build`.
- Decir explícitamente qué se probó y qué no (ej. "no probado en el navegador").

## Variables de Entorno Requeridas

- `AUTH0_SECRET`, `AUTH0_BASE_URL`, `AUTH0_ISSUER_BASE_URL`, `AUTH0_CLIENT_ID`, `AUTH0_CLIENT_SECRET`
- `MONGODB_URI`
- `MONGODB_DB` (opcional): nombre de la base. Sin definir = `degano-app` (prod). En local, apuntar a la copia de QA (ej. `degano-app-qa`). **En el código nunca escribir `'degano-app'`: usar `DB_NAME` de `@/lib/mongodb`.** Ojo: QA comparte los buckets de S3 con prod (borrar un archivo en QA lo borra de verdad).
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`
- `GOOGLE_DRIVE_FOLDER_ID`, `GOOGLE_REFRESH_TOKEN`, `NEXT_PUBLIC_GAPICONFIG_APIKEY`, `NEXT_PUBLIC_GAPICONFIG_CLIENTID`

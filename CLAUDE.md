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

**NUNCA:**
- Determinar disponibilidad por `location` o por el estado `outOfService` de la DB cuando hay fechas de evento en la query
- Permitir que un equipo se asigne a dos eventos con fechas solapadas
- Modificar `scheduledUses` sin actualizar el historial

**Limpieza automática (GET /api/equipment sin fechas):**
- Se limpian `scheduledUses` expirados (endDate < now)
- Si no quedan usos activos y `reason === 'En Evento'`: location vuelve a "Deposito", outOfService se limpia
- Esta limpieza NO se ejecuta en modo evento (cuando hay fechas en la query)

**Al crear evento (`postEvent`):**
1. Se agrega `scheduledUse` a todos los equipos asignados
2. Si el evento es HOY o pasado → se actualiza `outOfService`, `location`, `lastUsedStartDate/EndDate`
3. Si es futuro → solo se agrega el `scheduledUse` (el equipo sigue disponible hasta la fecha)

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
| Crear bandas/shows | ✅ | ❌ | ❌ |
| Crear empleados/salones | ✅ | ❌ | ❌ |
| Crear/editar/borrar pagos, adelantos, presupuestos | ✅ | ❌ | ❌ |
| Crear/editar/borrar calendarios y sus eventos | ✅ | ❌ | ❌ |
| Ver calendarios compartidos (solo lectura) | ✅ | ✅ | ✅ |
| Crear tableros y tareas | ✅ | ✅ | ✅ |
| Definir visibilidad de tableros | ✅ | ❌ | ❌ |
| Eliminar tableros | ✅ | ❌ | ❌ |

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

Usar utilidades de `/src/utils/equipmentHistoryUtils.ts`: `createHistoryEntry()`, `detectEquipmentChanges()`, `determineSpecialAction()`.

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
│   │   ├── salons/         # CRUD salones
│   │   ├── uploadToS3/     # Upload a AWS S3
│   │   ├── uploadToGoogleDrive/  # Upload a Google Drive
│   │   ├── me/             # Identidad del usuario logueado (vínculo con STAFF)
│   │   ├── appCalendars/   # CRUD calendarios extras (con visibilidad)
│   │   ├── calendarData/   # Calendarios + eventos visibles en una request
│   │   ├── calendarEvents/ # CRUD eventos de calendarios extras
│   │   ├── boards/         # CRUD tableros (?withTasks=1 trae tareas del primero)
│   │   ├── tasks/          # CRUD tareas de tableros
│   │   └── ...
│   ├── new-event/          # Página crear evento (formulario 10 tabs)
│   ├── event/[id]/         # Página editar evento
│   ├── equipment/          # Gestión de equipamiento (3 paneles)
│   ├── equipment-stock/    # Stock de equipamiento
│   ├── calendar/           # Calendario de eventos + calendarios extras
│   ├── tableros/           # Comunicación interna (tableros tipo Trello)
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
| `calendar_events` | Eventos de los calendarios extras (`calendarId`) |
| `boards` | Tableros de Comunicación Interna con `visibility`/`ownerId`/`memberIds` |
| `tasks` | Tareas de los tableros (`boardId`, `status`, `order`, `assigneeId` = `_id` de empleado) |

## Convenciones de Código

- **API routes:** Siempre wrappear con `withAuth()` o variantes. Retornar `NextResponse.json()`
- **Nunca reusar una `NextResponse` creada a nivel de módulo:** el body se lee una sola vez y la segunda request falla con 500. Usar una función (`const forbidden = () => NextResponse.json(...)`).
- **Front: `fetch` no tira error con 4xx/5xx.** Siempre validar `res.ok` y mostrar el mensaje de error real del servidor. Nunca notificar éxito sin chequearlo.
- **Projections:** al agregar un campo nuevo a una colección, actualizar las projections de las APIs que la sirven (`/api/getEvents`, `/api/calendarData`, `/api/categoryTreeData`, etc.) o el campo no llega al front.
- **Bodies parciales:** varios componentes mandan updates parciales (solo el campo que cambian). `updateEvent` y cualquier PUT nuevo tienen que chequear que los campos existan antes de procesarlos (ej. el diff de equipamiento solo corre si vienen `equipment`, `date` y `endDate`), y no borrar datos por ausencia de una clave.
- **MongoDB:** no usar `$set` y `$unset` sobre el mismo campo en un update (conflicto → error). Lo mismo con `$addToSet` + `$pull` sobre el mismo array: hacerlo en dos pasos.
- **Vercel Hobby:** body máximo 4.5MB, timeout 10s. Los archivos se suben directo del browser a S3 con presigned URLs, nunca por body a una API route.
- **Data fetching:** Usar SWR con `fetcher`. Invalidar caché con `mutate()` después de cambios
- **Formulario de eventos:** 10 tabs en orden: CLIENT → EVENT → SHOW → MUSIC → TIMING → MORE_INFO → EQUIPMENT → STAFF → PAYMENT → FILES
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

## Verificación antes de dar algo por terminado

- **Typecheck:** `npx tsc --noEmit` (sin pedir permiso).
- **Tests:** `npm test` (Vitest). Se testea **lógica de negocio pura** (`src/**/*.test.ts`, al lado del código). Para testear algo de un componente o endpoint, primero extraerlo a una función pura y que producción use esa misma función.
- Cambios grandes o antes de un deploy: `next build`.
- Decir explícitamente qué se probó y qué no (ej. "no probado en el navegador").

## Variables de Entorno Requeridas

- `AUTH0_SECRET`, `AUTH0_BASE_URL`, `AUTH0_ISSUER_BASE_URL`, `AUTH0_CLIENT_ID`, `AUTH0_CLIENT_SECRET`
- `MONGODB_URI`
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`
- `GOOGLE_DRIVE_FOLDER_ID`, `GOOGLE_REFRESH_TOKEN`, `NEXT_PUBLIC_GAPICONFIG_APIKEY`, `NEXT_PUBLIC_GAPICONFIG_CLIENTID`

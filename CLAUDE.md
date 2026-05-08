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

**Reglas de ofuscación:**
- Teléfonos de clientes → `****` para manager y viewer
- Teléfonos de shows → `****` solo para viewer
- Precios de equipamiento → `****` para manager y viewer
- Pagos/presupuestos → ocultos completamente para manager y viewer

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
│   │   └── ...
│   ├── new-event/          # Página crear evento (formulario 10 tabs)
│   ├── event/[id]/         # Página editar evento
│   ├── equipment/          # Gestión de equipamiento (3 paneles)
│   ├── equipment-stock/    # Stock de equipamiento
│   ├── calendar/           # Calendario de eventos
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
| `employees` | Personal/staff |
| `genres` | Géneros musicales |
| `salons` | Salones/venues |

## Convenciones de Código

- **API routes:** Siempre wrappear con `withAuth()` o variantes. Retornar `NextResponse.json()`
- **Data fetching:** Usar SWR con `fetcher`. Invalidar caché con `mutate()` después de cambios
- **Formulario de eventos:** 10 tabs en orden: CLIENT → EVENT → SHOW → MUSIC → TIMING → MORE_INFO → EQUIPMENT → STAFF → PAYMENT → FILES
- **Componentes:** Funcionales con hooks. Mantine para toda la UI
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

## Variables de Entorno Requeridas

- `AUTH0_SECRET`, `AUTH0_BASE_URL`, `AUTH0_ISSUER_BASE_URL`, `AUTH0_CLIENT_ID`, `AUTH0_CLIENT_SECRET`
- `MONGODB_URI`
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`
- `GOOGLE_DRIVE_FOLDER_ID`, `GOOGLE_REFRESH_TOKEN`, `NEXT_PUBLIC_GAPICONFIG_APIKEY`, `NEXT_PUBLIC_GAPICONFIG_CLIENTID`

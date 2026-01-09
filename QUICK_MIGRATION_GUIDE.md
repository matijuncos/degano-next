# 🚀 Guía Rápida de Migración - Copiar y Pegar

## ✅ Ya Actualizado

### API Routes Completadas:
1. ✅ `/src/app/api/deleteEvent/[id]/route.ts` - Solo admin y manager
2. ✅ `/src/app/api/getEvents/route.ts` - Ofusca datos según rol
3. ✅ `/src/app/api/postEvent/route.ts` - Todos pueden crear
4. ✅ `/src/app/api/updateEvent/route.ts` - Solo admin y manager
5. ✅ `/src/app/api/removeClient/[id]/route.ts` - Solo admin y manager

---

## 📋 Pendientes de Actualizar

### Patrón 1: Solo Admin (CREATE)

**Archivos:**
- `/src/app/api/postEquipmentV2/route.ts`
- `/src/app/api/uploadToGoogleDrive/route.ts`

**Código:**
```typescript
// ANTES:
import { getSession } from '@auth0/nextjs-auth0';
export const POST = async function handler(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // ... resto del código
};

// DESPUÉS:
import { withAdminAuth, AuthContext } from '@/lib/withAuth';
export const POST = withAdminAuth(async (context: AuthContext, req: Request) => {
  // context.user y context.role disponibles
  // ... resto del código igual
});
```

**Cambios:**
1. Cambiar `getSession` por `withAdminAuth, AuthContext`
2. Envolver handler con `withAdminAuth(async (context: AuthContext, ...) => { })`
3. Reemplazar `session?.user` por `context.user`
4. Cerrar con `});` en lugar de `};`

---

### Patrón 2: Admin y Manager (EDIT/DELETE)

**Archivos:**
- `/src/app/api/updateEquipmentV2/route.ts`
- `/src/app/api/deleteEquipment/route.ts`
- `/src/app/api/updateBands/route.ts`

**Código:**
```typescript
// ANTES:
import { getSession } from '@auth0/nextjs-auth0';
export const PUT = async function handler(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // ... código
};

// DESPUÉS:
import { withAuth, AuthContext } from '@/lib/withAuth';
export const PUT = withAuth(
  async (context: AuthContext, req: Request) => {
    // ... código igual (sin validación de session)
  },
  { requiredPermission: 'canEditEquipment' } // o canDeleteEquipment, canEditShows
);
```

**Reemplazar permisos según endpoint:**
- `updateEquipmentV2` → `canEditEquipment`
- `deleteEquipment` → `canDeleteEquipment`
- `updateBands` → `canEditShows`

---

### Patrón 3: Lectura con Ofuscación (GET)

**Archivo:**
- `/src/app/api/getEvent/route.ts`

**Código:**
```typescript
import { withAuth, AuthContext } from '@/lib/withAuth';
import { getPermissions, obfuscatePhone, obfuscatePrices } from '@/utils/roleUtils';

export const GET = withAuth(async (context: AuthContext, req: Request) => {
  // ... obtener evento de DB

  const permissions = getPermissions(context.role);

  // Ofuscar datos sensibles
  const filteredEvent = {
    ...event,
    // Pagos
    payment: permissions.canViewPayments ? event.payment : null,

    // Teléfonos de clientes
    phoneNumber: obfuscatePhone(event.phoneNumber, context.role, 'client'),

    // Teléfonos de clientes extras
    extraClients: (event.extraClients || []).map((client: any) => ({
      ...client,
      phoneNumber: obfuscatePhone(client.phoneNumber, context.role, 'client'),
    })),

    // Teléfonos de shows
    bands: (event.bands || []).map((band: any) => ({
      ...band,
      contacts: (band.contacts || []).map((contact: any) => ({
        ...contact,
        phone: obfuscatePhone(contact.phone, context.role, 'show'),
      })),
    })),

    // Precios de equipamiento
    equipment: obfuscatePrices(event.equipment || [], context.role),
  };

  return NextResponse.json({ event: filteredEvent });
});
```

---

## 🎨 Actualizar Componentes

### Patrón 1: Ocultar Botones Sin Permiso

**Archivo:**
- `/src/app/event/[id]/page.tsx`

**Código:**
```typescript
import { usePermissions } from '@/hooks/usePermissions';
import ProtectedAction from '@/components/ProtectedAction/ProtectedAction';

export default function EventPage() {
  const { can, permissions, role } = usePermissions();

  return (
    <div>
      {/* Botón de eliminar - solo si tiene permiso */}
      <ProtectedAction requiredPermission="canDeleteEvents">
        <Button onClick={handleDelete} color="red">
          Eliminar Evento
        </Button>
      </ProtectedAction>

      {/* Botón de editar - deshabilitar sin permiso */}
      <ProtectedAction
        requiredPermission="canEditEvents"
        disableInsteadOfHide
        showTooltip
        tooltipMessage="No tienes permisos para editar"
      >
        <Button onClick={handleEdit}>Editar</Button>
      </ProtectedAction>

      {/* Tab de pagos - solo si puede verlos */}
      {can('canViewPayments') && (
        <Tabs.Tab value="payments">Presupuesto</Tabs.Tab>
      )}
    </div>
  );
}
```

---

### Patrón 2: Ofuscar Datos en Vista

**Archivo:**
- `/src/app/event/[id]/page.tsx`

**Código:**
```typescript
import { usePermissions } from '@/hooks/usePermissions';
import { obfuscatePhone } from '@/utils/roleUtils';

export default function EventPage() {
  const { permissions, role } = usePermissions();

  return (
    <div>
      {/* Teléfono de cliente */}
      <EditableData
        type='text'
        property='phoneNumber'
        title='Teléfono'
        value={permissions.canViewClientPhones
          ? selectedEvent.phoneNumber
          : obfuscatePhone(selectedEvent.phoneNumber, role, 'client')}
      />

      {/* Precio de equipo */}
      {permissions.canViewEquipmentPrices ? (
        <Text>Precio: ${equipment.price}</Text>
      ) : (
        <Text>Precio: ****</Text>
      )}

      {/* Sección de pagos - ocultar si no tiene permiso */}
      {can('canViewPayments') && (
        <div>
          <h2>Presupuesto</h2>
          <p>Total: ${event.payment.amount}</p>
        </div>
      )}
    </div>
  );
}
```

---

### Patrón 3: NavBar con Permisos

**Archivo:**
- `/src/components/NavBar/NavBar.tsx`

**Código:**
```typescript
import { usePermissions } from '@/hooks/usePermissions';

export default function NavBar() {
  const { can, isAdmin } = usePermissions();

  return (
    <nav>
      <Link href="/events">Eventos</Link>
      <Link href="/calendar">Calendario</Link>

      {/* Solo mostrar si tiene permiso */}
      {can('canViewClients') && (
        <Link href="/clients">Clientes</Link>
      )}

      {/* Solo admin */}
      {isAdmin && (
        <>
          <Link href="/payments">Pagos</Link>
        </>
      )}
    </nav>
  );
}
```

---

### Patrón 4: HomeTile con Validación

**Archivo:**
- `/src/components/HomeTile/HomeTile.tsx`

**Código:**
```typescript
import { usePermissions } from '@/hooks/usePermissions';
import { Tooltip } from '@mantine/core';

export default function HomeTile({ path, title }: { path: string; title: string }) {
  const { can } = usePermissions();
  const [isHovered, setIsHovered] = useState(false);

  // Verificar permiso según path
  const hasPermission = (() => {
    if (path === '/clients') return can('canViewClients');
    if (path === '/payments') return can('canViewPayments');
    return true;
  })();

  if (!hasPermission && isHovered) {
    return (
      <Tooltip label="No tienes acceso a esta sección">
        <Card opacity={0.5} style={{ cursor: 'not-allowed' }}>
          {title}
        </Card>
      </Tooltip>
    );
  }

  if (!hasPermission) {
    return null; // No mostrar tile
  }

  return (
    <Link href={path}>
      <Card>{title}</Card>
    </Link>
  );
}
```

---

## 🔄 Buscar y Reemplazar Rápido

### Para todos los API routes:

1. **Buscar:**
```typescript
const session = await getSession();
if (!session) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

2. **Reemplazar por:** (según el caso)
```typescript
// Opción 1: Solo validar que esté autenticado
import { withAuth, AuthContext } from '@/lib/withAuth';
export const METHOD = withAuth(async (context: AuthContext, req) => {
  // código
});

// Opción 2: Solo admin
import { withAdminAuth, AuthContext } from '@/lib/withAuth';
export const METHOD = withAdminAuth(async (context: AuthContext, req) => {
  // código
});
```

3. **Reemplazar:**
```typescript
session?.user?.sub → context.user?.sub
session.user → context.user
```

---

## 📝 Checklist de Archivos

### API Routes (Prioridad Alta):

- [ ] `/src/app/api/postEquipmentV2/route.ts` - withAdminAuth
- [ ] `/src/app/api/updateEquipmentV2/route.ts` - withAuth + canEditEquipment
- [ ] `/src/app/api/deleteEquipment/route.ts` - withAuth + canDeleteEquipment
- [ ] `/src/app/api/updateBands/route.ts` - withAuth + canEditShows
- [ ] `/src/app/api/getEvent/route.ts` - withAuth + ofuscar datos
- [ ] `/src/app/api/equipment/route.ts` - withAuth + ofuscar precios

### Componentes (Prioridad Alta):

- [ ] `/src/app/event/[id]/page.tsx` - usePermissions + ProtectedAction + ofuscar
- [ ] `/src/components/NavBar/NavBar.tsx` - usePermissions + mostrar/ocultar links
- [ ] `/src/app/home/page.tsx` - usePermissions + proteger tiles
- [ ] `/src/components/HomeTile/HomeTile.tsx` - validar permisos
- [ ] `/src/components/EditableData/EditableData.tsx` - deshabilitar si no puede editar
- [ ] `/src/components/EditablePayments/EditablePayments.tsx` - solo si canViewPayments

---

## 🧪 Testing Rápido

```typescript
// En cualquier componente
import { usePermissions } from '@/hooks/usePermissions';

const { role, can, permissions } = usePermissions();

console.log('=== MI ROL ===');
console.log('Rol:', role);
console.log('Puedo ver teléfonos clientes:', can('canViewClientPhones'));
console.log('Puedo ver teléfonos shows:', can('canViewShowPhones'));
console.log('Puedo ver pagos:', can('canViewPayments'));
console.log('Puedo eliminar eventos:', can('canDeleteEvents'));
console.log('Puedo editar eventos:', can('canEditEvents'));
```

**Resultados esperados:**

| Permiso | Admin | Manager | Viewer |
|---------|-------|---------|--------|
| canViewClientPhones | ✅ true | ❌ false | ❌ false |
| canViewShowPhones | ✅ true | ✅ true | ❌ false |
| canViewPayments | ✅ true | ❌ false | ❌ false |
| canDeleteEvents | ✅ true | ✅ true | ❌ false |
| canEditEvents | ✅ true | ✅ true | ❌ false |

---

## ⚡ Atajos VSCode

Para buscar y reemplazar en múltiples archivos:

1. `Cmd/Ctrl + Shift + F` - Buscar en archivos
2. Buscar: `const session = await getSession();`
3. Reemplazar según patrón arriba
4. Revisar cada archivo antes de aplicar

---

## 🎯 Próximo Paso Inmediato

1. **Probar lo que ya está:**
   ```bash
   npm run dev
   ```

2. **Verificar en home:**
   ```typescript
   // En /src/app/home/page.tsx
   const { role } = usePermissions();
   console.log('Mi rol:', role);
   ```

3. **Probar getEvents:**
   - Ir a lista de eventos
   - Abrir DevTools → Network
   - Ver respuesta de `/api/getEvents`
   - Verificar que teléfonos están ofuscados si eres manager/viewer

4. **Actualizar resto de archivos** usando patrones arriba

---

¿Todo claro? Los patrones son simples de copiar y pegar. Cualquier archivo que actualices, sigue el patrón correspondiente.

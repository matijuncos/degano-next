import {
  EquipmentHistoryEntry,
  CreateHistoryEntryParams,
  EquipmentChange
} from '@/types/equipmentHistory';

/**
 * Detecta los cambios entre dos objetos de equipamiento
 * Retorna array de cambios detectados
 */
export function detectEquipmentChanges(oldEquipment: any, newEquipment: any): EquipmentChange[] {
  const changes: EquipmentChange[] = [];

  // Campos a comparar (excluir _id, lastUsedStartDate, lastUsedEndDate que se actualizan automáticamente)
  const fieldsToCompare = [
    'name',
    'code',
    'brand',
    'model',
    'serialNumber',
    'rentalPrice',
    'investmentPrice',
    'weight',
    'location',
    'propiedad',
    'history',
    'imageUrl',
    'pdfUrl'
  ];

  fieldsToCompare.forEach((field) => {
    if (oldEquipment[field] !== newEquipment[field]) {
      changes.push({
        field,
        oldValue: oldEquipment[field],
        newValue: newEquipment[field]
      });
    }
  });

  // Comparar outOfService (objeto anidado)
  if (oldEquipment.outOfService?.isOut !== newEquipment.outOfService?.isOut) {
    changes.push({
      field: 'outOfService.isOut',
      oldValue: oldEquipment.outOfService?.isOut,
      newValue: newEquipment.outOfService?.isOut
    });
  }

  if (
    oldEquipment.outOfService?.reason !== newEquipment.outOfService?.reason
  ) {
    changes.push({
      field: 'outOfService.reason',
      oldValue: oldEquipment.outOfService?.reason,
      newValue: newEquipment.outOfService?.reason
    });
  }

  return changes;
}

/**
 * Determina acciones especiales basadas en los cambios detectados
 * Retorna: 'traslado' si cambió location, 'cambio_estado' si cambió outOfService, null si es edición normal
 */
export function determineSpecialAction(
  changes: EquipmentChange[]
): 'traslado' | 'cambio_estado' | null {
  const locationChanged = changes.some((c) => c.field === 'location');
  const stateChanged = changes.some((c) => c.field.startsWith('outOfService'));

  // Prioridad: traslado > cambio_estado
  if (locationChanged) return 'traslado';
  if (stateChanged) return 'cambio_estado';
  return null;
}

/**
 * Crea una entrada de historial en la base de datos
 */
export async function createHistoryEntry(
  db: any,
  params: CreateHistoryEntryParams
): Promise<void> {
  try {
    const entry: EquipmentHistoryEntry = {
      equipmentId: params.equipmentId,
      equipmentName: params.equipmentName,
      equipmentCode: params.equipmentCode,
      action: params.action,
      date: new Date(),
      userId: params.userId,
      changes: params.changes,
      eventId: params.eventId,
      eventName: params.eventName,
      eventDate: params.eventDate,
      eventLocation: params.eventLocation,
      details: params.details,
      fromValue: params.fromValue,
      toValue: params.toValue
    };

    // Limpiar campos undefined
    Object.keys(entry).forEach((key) => {
      if (entry[key as keyof EquipmentHistoryEntry] === undefined) {
        delete entry[key as keyof EquipmentHistoryEntry];
      }
    });

    await db.collection('equipmentHistory').insertOne(entry);
  } catch (error) {
    console.error('Error creating history entry:', error);
    // No lanzar error para no romper el flujo principal
  }
}

/**
 * Obtiene el historial de un equipamiento específico
 */
export async function getEquipmentHistory(
  db: any,
  equipmentId: string
): Promise<EquipmentHistoryEntry[]> {
  return await db
    .collection('equipmentHistory')
    .find({ equipmentId })
    .sort({ date: -1 }) // Más reciente primero
    .toArray();
}

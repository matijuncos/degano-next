import { EventModel } from '@/context/types';

export interface FieldConfig {
  key: keyof EventModel;
  label: string;
  section: 'event' | 'location' | 'schedule' | 'client';
  type: 'text' | 'time' | 'date';
  placeholder?: string;
}

export const OPTIONAL_FIELDS: FieldConfig[] = [
  // Datos del evento
  {
    key: 'company',
    label: 'Empresa',
    section: 'event',
    type: 'text',
    placeholder: 'Nombre de la empresa'
  },
  {
    key: 'guests',
    label: 'Cantidad de Invitados',
    section: 'event',
    type: 'text',
    placeholder: 'Número de invitados'
  },

  // Ubicación
  {
    key: 'eventAddress',
    label: 'Dirección',
    section: 'location',
    type: 'text',
    placeholder: 'Dirección del evento'
  },
  {
    key: 'venueContactName',
    label: 'Nombre contacto del lugar',
    section: 'location',
    type: 'text',
    placeholder: 'Nombre del contacto'
  },
  {
    key: 'venueContactPhone',
    label: 'Teléfono de contacto',
    section: 'location',
    type: 'text',
    placeholder: 'Teléfono del lugar'
  },

  // Horarios
  {
    key: 'churchDate',
    label: 'Hora de iglesia',
    section: 'schedule',
    type: 'time',
    placeholder: '00:00'
  },
  {
    key: 'civil',
    label: 'Hora del civil',
    section: 'schedule',
    type: 'time',
    placeholder: '00:00'
  },
  {
    key: 'staffArrivalDate',
    label: 'Fecha llegada staff',
    section: 'schedule',
    type: 'date',
    placeholder: 'DD/MM/AAAA'
  },
  {
    key: 'equipmentArrivalDate',
    label: 'Fecha llegada equipamiento',
    section: 'schedule',
    type: 'date',
    placeholder: 'DD/MM/AAAA'
  },
  {
    key: 'staffArrivalTime',
    label: 'Horario llegada staff',
    section: 'schedule',
    type: 'time',
    placeholder: '00:00'
  },
  {
    key: 'equipmentArrivalTime',
    label: 'Horario llegada equipamiento',
    section: 'schedule',
    type: 'time',
    placeholder: '00:00'
  },

  // Cliente
  {
    key: 'email',
    label: 'Email',
    section: 'client',
    type: 'text',
    placeholder: 'email@ejemplo.com'
  },
  {
    key: 'rol',
    label: 'Rol en el evento',
    section: 'client',
    type: 'text',
    placeholder: 'Ej: Novia, Novio, Padre, etc.'
  },
  {
    key: 'age',
    label: 'Edad',
    section: 'client',
    type: 'text',
    placeholder: 'Edad del cliente'
  },
  {
    key: 'address',
    label: 'Dirección',
    section: 'client',
    type: 'text',
    placeholder: 'Dirección del cliente'
  }
];

export const SECTION_LABELS: Record<FieldConfig['section'], string> = {
  event: 'Datos del evento',
  location: 'Ubicación',
  schedule: 'Horarios',
  client: 'Cliente'
};

/**
 * Detecta qué campos opcionales están vacíos o indefinidos en un evento.
 * @param event - El evento a analizar
 * @returns Array de configuraciones de campos que están faltantes
 */
export const detectMissingFields = (
  event: EventModel | null
): FieldConfig[] => {
  if (!event) return [];

  return OPTIONAL_FIELDS.filter((field) => {
    const value = event[field.key];
    // Considera como faltante si es undefined, null, o string vacío
    return !value || (typeof value === 'string' && value.trim() === '');
  });
};

/**
 * Agrupa campos por sección.
 * @param fields - Array de configuraciones de campos
 * @returns Objeto con campos agrupados por sección
 */
export const groupFieldsBySection = (
  fields: FieldConfig[]
): Record<FieldConfig['section'], FieldConfig[]> => {
  return fields.reduce(
    (acc, field) => {
      if (!acc[field.section]) {
        acc[field.section] = [];
      }
      acc[field.section].push(field);
      return acc;
    },
    {} as Record<FieldConfig['section'], FieldConfig[]>
  );
};

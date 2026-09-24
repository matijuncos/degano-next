// Tipos de los calendarios extras (app_calendars)

// 'all' = todos; 'admins' = solo admins (default legacy); 'restricted' = dueño + empleados en memberIds
export type CalendarVisibility = 'all' | 'admins' | 'restricted';

export interface AppCalendar {
  _id: string;
  name: string;
  color: string;
  // Control de acceso
  ownerId?: string | null; // _id del empleado que lo creó (mismo criterio que memberIds)
  visibility?: CalendarVisibility; // ausente = calendario viejo → se trata como 'admins'
  memberIds?: string[]; // _id de empleados de STAFF con acceso cuando visibility === 'restricted'
}

// Lo que envía el formulario de crear/editar calendario
export interface CalendarFormValues {
  name: string;
  color: string;
  visibility: CalendarVisibility;
  memberIds: string[];
}

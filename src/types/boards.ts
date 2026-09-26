// Tipos del módulo de Comunicación Interna (tableros tipo Trello)

// Estados fijos = las 3 columnas del tablero
export type TaskStatus = 'pending' | 'in_progress' | 'done';

export const TASK_STATUSES: TaskStatus[] = ['pending', 'in_progress', 'done'];

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  pending: 'Pendiente',
  in_progress: 'En curso',
  done: 'Finalizada'
};

// Visibilidad del tablero: 'all' = todos los usuarios; 'restricted' = solo el
// dueño + los miembros de memberIds. "Solo yo" = restricted con memberIds=[owner].
export type BoardVisibility = 'all' | 'restricted';

export interface Board {
  _id: string;
  name: string;
  description?: string;
  order: number;
  createdAt: string | Date;
  createdBy?: string | null;
  // Control de acceso. Dueño y miembros se guardan con el _id del registro de
  // STAFF (directorio único), no con el sub de Auth0: el vínculo entre la cuenta
  // de login y su empleado se resuelve por email en /api/me.
  ownerId?: string | null; // _id del empleado que lo creó
  visibility?: BoardVisibility;
  memberIds?: string[]; // _id de empleados con acceso si visibility === 'restricted' (incluye al dueño)
}

export interface Task {
  _id: string;
  boardId: string;
  title: string;
  description?: string;
  status: TaskStatus;
  assigneeId?: string | null;
  assigneeName?: string | null;
  order: number;
  createdAt: string | Date;
  updatedAt?: string | Date;
  createdBy?: string | null;
}

// Estado siguiente/anterior en el flujo Pendiente → En curso → Finalizada.
// null = no hay a dónde avanzar/retroceder (extremos del flujo).
export function nextTaskStatus(status: TaskStatus): TaskStatus | null {
  const idx = TASK_STATUSES.indexOf(status);
  return idx >= 0 && idx < TASK_STATUSES.length - 1 ? TASK_STATUSES[idx + 1] : null;
}

export function prevTaskStatus(status: TaskStatus): TaskStatus | null {
  const idx = TASK_STATUSES.indexOf(status);
  return idx > 0 ? TASK_STATUSES[idx - 1] : null;
}

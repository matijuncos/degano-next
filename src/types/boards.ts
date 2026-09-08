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
  // Control de acceso
  ownerId?: string | null; // sub (Auth0) del creador
  visibility?: BoardVisibility;
  memberIds?: string[]; // subs con acceso cuando visibility === 'restricted' (siempre incluye al dueño)
}

// Usuario del directorio propio (se llena al entrar cada persona)
export interface DirectoryUser {
  sub: string;
  email?: string | null;
  name?: string | null;
  role?: string | null;
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

// Tipos del módulo de Comunicación Interna (tableros tipo Trello)

// Estados fijos = las 3 columnas del tablero
export type TaskStatus = 'pending' | 'in_progress' | 'done';

export const TASK_STATUSES: TaskStatus[] = ['pending', 'in_progress', 'done'];

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  pending: 'Pendiente',
  in_progress: 'En curso',
  done: 'Finalizada'
};

export interface Board {
  _id: string;
  name: string;
  description?: string;
  order: number;
  createdAt: string | Date;
  createdBy?: string | null;
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

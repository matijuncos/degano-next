import { ObjectId } from 'mongodb';

export type HistoryAction = 'creacion' | 'edicion' | 'uso_evento' | 'traslado' | 'cambio_estado';

export interface EquipmentChange {
  field: string;
  oldValue: any;
  newValue: any;
}

export interface EquipmentHistoryEntry {
  _id?: ObjectId;
  equipmentId: string;
  equipmentName: string;
  equipmentCode?: string;
  action: HistoryAction;
  date: Date;
  userId?: string;

  // Para edicion
  changes?: EquipmentChange[];

  // Para uso_evento
  eventId?: string;
  eventName?: string;
  eventDate?: Date;
  eventLocation?: string;

  // Para traslado/cambio_estado
  details?: string;
  fromValue?: string;
  toValue?: string;
}

export interface CreateHistoryEntryParams {
  equipmentId: string;
  equipmentName: string;
  equipmentCode?: string;
  action: HistoryAction;
  userId?: string;
  changes?: EquipmentChange[];
  eventId?: string;
  eventName?: string;
  eventDate?: Date;
  eventLocation?: string;
  details?: string;
  fromValue?: string;
  toValue?: string;
}

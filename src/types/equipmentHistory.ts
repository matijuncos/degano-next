import { ObjectId } from 'mongodb';

// 'nota': escrita a mano (bitácora; no se edita ni se borra)
// 'eliminacion': el equipo se borró (queda una foto de sus datos)
export type HistoryAction = 'creacion' | 'edicion' | 'uso_evento' | 'traslado' | 'cambio_estado' | 'nota' | 'eliminacion';

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
  eventEndDate?: Date;
  eventLocation?: string;
  eventClientName?: string;

  // Para traslado/cambio_estado
  details?: string;
  fromValue?: string;
  toValue?: string;

  // Nota: texto y autor (nombre al momento de escribirla)
  note?: string;
  authorName?: string;
  // Lo agrega la API al leer: nombre de quien hizo el cambio
  userName?: string;
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
  eventEndDate?: Date;
  eventLocation?: string;
  eventClientName?: string;
  details?: string;
  fromValue?: string;
  toValue?: string;
}

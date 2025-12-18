import { NewEquipment } from '@/components/equipmentStockTable/types';
import { ReactNode } from 'react';

export interface ExtraContact {
  _id: string;
  name: string;
  phone: string;
  rol: string;
  type: 'contact';
}

export interface ExtraClient {
  _id?: string;
  fullName: string;
  phoneNumber: string;
  email?: string;
  rol: string;
  age?: string;
  address?: string;
}

export interface CeremonyMusic {
  ingreso: string;
  firmas: string;
  salida: string;
  otros?: { titulo: string; cancion: string }[];
}

export interface AmbienceMusicItem {
  descripcion: string; // ej: "Recepción", "Cena"
  generos: string[]; // ej: ["Chill out", "electro pop", "Sunset"]
}

export interface EventModel {
  // All event properties
  fullName: string;
  phoneNumber: string;
  rol: string;
  extraClients: ExtraClient[];
  email?: string;
  age: string;
  address: string;
  type: string;
  company?: string;
  guests: string;
  eventAddress: string;
  eventCity: string;
  lugar: string;
  venueContact?: string; // Legacy - mantener para retrocompatibilidad
  venueContactName?: string; // Nuevo campo - nombre del contacto
  venueContactPhone?: string; // Nuevo campo - teléfono del contacto
  churchDate?: string;
  civil: string;
  bands: Array<Band>;
  music: Music;
  equipment: NewEquipment[];
  equipmentPrice: number;
  payment: {
    upfrontAmount: string;
    totalPaymentDate?: Date;
    totalToPay: string;
    partialPaymentDate: Date;
    partialPayed: boolean;
    totalPayed: boolean;
    subsequentPayments?: any[];
  };
  moreData: string;
  date: Date | string;
  endDate: Date | string;
  active: boolean;
  playlist: {
    label: string;
    url: string;
  }[];
  // status: string;
  _id: string;
  welcomeSongs?: string[]; // Tema 1, Tema 2, etc.
  walkIn?: string[]; // Canción de rosas - Tema 1, Tema 2, etc.
  vals?: string[]; // Vals 1, Vals 2, etc.
  openingPartySong?: string; // Canción apertura pista
  ceremoniaCivil?: CeremonyMusic;
  ceremoniaExtra?: CeremonyMusic;
  ambienceMusic?: AmbienceMusicItem[];
  timing?: {
    time: string;
    title: string;
    details: string;
  }[];
  staff?: {
    employeeId: string;
    employeeName: string;
    rol: string;
  }[];
  staffArrivalTime?: string;
  equipmentArrivalTime?: string;
}
export interface SelectedEventType extends EventModel {
  title?: string;
  start?: string;
  end?: string;
  allDay: boolean;
  selectable: boolean;
  _id: string;
}

export interface DeganoContextProps {
  selectedEvent: SelectedEventType | null;
  setSelectedEvent: Function;
  activeNavTab: number;
  setActiveNavTab: Function;
  singleEventData: EventModel | null;
  setSingleEventData: Function;
  allEvents: EventModel[];
  setAllEvents: Function;
  formState: number;
  setFormState: Function;
  validate: boolean;
  setValidate: Function;
  fetchEvents: () => void;
  loading: boolean;
  setLoading: Function;
  folderName: string;
  setFolderName: Function;
  authToken: string;
  setAuthToken: Function;
}
export interface DataverseProviderProps {
  children: ReactNode;
}

export interface Equipment {
  name: string;
  quantity: number;
  price: number;
}

export interface Music {
  genres: {
    genre: string;
    value: number;
  }[];
  forbidden: string[];
  required: string[];
}

export interface Band {
  _id: string;
  bandName: string;
  showTime?: string;
  testTime?: string;
  bandInfo: string;
  contacts: ExtraContact[];
  fileUrls?: string[]; // Array para múltiples archivos
  type: 'band';
}

export interface EmployeeModel {
  _id?: string;
  fullName: string;
  cardId: string;
  rol: string;
  license: string;
  licenseType?: string;
}

export type EventsList = EventModel[];

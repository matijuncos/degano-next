import { NewEquipment } from '@/components/equipmentStockTable/types';
import { ReactNode } from 'react';

export interface ExtraContact {
  _id: string;
  name: string;
  phone: string;
}

export interface EventModel {
  // All event properties
  fullName: string;
  phoneNumber: string;
  email: string;
  age: string;
  address: string;
  type: string;
  guests: string;
  eventAddress: string;
  eventCity: string;
  lugar: string;
  churchDate?: string;
  civil: string;
  bands: Array<Band>;
  music: Music;
  equipment: NewEquipment[];
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
  endDate?: Date | string;
  active: boolean;
  playlist: {
    label: string;
    url: string;
  }[];
  // status: string;
  _id: string;
  welcomeSongs?: string[];
  walkIn?: string[];
  vals?: string[];
  openingPartySong?: string;
  ambienceMusic?: string[];
  timing?: {
    time: string;
    title: string;
    details: string;
  }[];
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
  managerId?: string;
  manager: string;
  managerPhone: string;
  bandInfo: string;
  contacts: ExtraContact[];
  fileUrl: string;
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

import { NewEquipment } from '@/components/equipmentStockTable/types';
import { ReactNode } from 'react';

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
  salon: string;
  averageAge: string;
  churchDate?: string;
  civil: string;
  bandName: string;
  manager: string;
  managerPhone: string;
  showtime: string;
  moreData: string;
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
  date: Date | string;
  endDate?: Date;
  active: boolean;
  playlist: {
    label: string;
    url: string;
  }[];
  _id: string;
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

export type EventsList = EventModel[];

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
  eventDate: string;
  churchDate: string;
  civil: string;
  bandName: string;
  manager: string;
  managerPhone: string;
  showtime: string;
  moreData: string;
  music: Music;
  equipment: Equipment;
  payment: object;
  date: Date;
  upfrontAmount: string;
  totalPaymentDate: Date;
  totalToPay: string;
  partialPaymentDate: string;
  partialPayed: boolean;
  totalPayed: boolean;
  active: boolean;
  playlist: string[];
  _id: string;
}
export interface SelectedEventType extends EventModel {
  // Object that comes from calendar click event
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
}
export interface DataverseProviderProps {
  children: ReactNode;
}

export interface Equipment {
  name: string;
  quantity: number;
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
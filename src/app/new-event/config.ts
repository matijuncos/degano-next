import { genres } from '@/context/config';
import { EventModel } from '@/context/types';

export const INITIAL_EVENT_STATE: EventModel = {
  _id: '', // Use empty string instead of null
  fullName: '',
  phoneNumber: '',
  email: '',
  age: '',
  address: '',
  type: '',
  guests: '',
  eventAddress: '',
  eventCity: '',
  salon: '',
  date: '',
  averageAge: '',
  churchDate: '',
  civil: new Date().toISOString(),
  bandName: '',
  manager: '',
  managerPhone: '',
  moreData: '',
  showtime: new Date().getTime().toString(),
  music: {
    genres: genres,
    required: [],
    forbidden: []
  },
  equipment: [],
  payment: {
    upfrontAmount: '',
    totalToPay: '',
    partialPaymentDate: new Date(),
    partialPayed: false,
    totalPayed: false
  },
  active: true,
  playlist: []
};

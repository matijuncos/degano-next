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
  civil: '',
  bands: [],
  moreData: '',
  music: {
    genres: [], // Will be populated from database
    required: [],
    forbidden: []
  },
  equipment: [],
  payment: {
    upfrontAmount: '',
    totalToPay: '',
    partialPaymentDate: new Date(),
    partialPayed: false,
    totalPayed: false,
    subsequentPayments: []
  },
  active: true,
  playlist: [],
  timing: []
};

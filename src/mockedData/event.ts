import { EventModel, EventsList } from '@/context/types';

export const mockedEvent: EventModel = {
  fullName: 'Alex Johnson',
  phoneNumber: '123-456-7890',
  email: 'alex.johnson@example.com',
  age: '30',
  address: '123 Main St, Anytown, AT 12345',
  type: 'Wedding',
  guests: '150',
  eventAddress: '456 Park Ave, Anytown, AT 12345',
  eventCity: 'Anytown',
  salon: 'Grand Salon',
  averageAge: '30',
  eventDate: '2024-04-06T15:00:00.000Z',
  churchDate: '2024-04-06T11:00:00.000Z',
  civil: '2024-04-05T09:00:00.000Z',
  bandName: 'The Eventuals',
  manager: 'Sam Rivera',
  managerPhone: '987-654-3210',
  showtime: '20:00',
  moreData: 'N/A',
  music: {
    genres: [
      { genre: 'Jazz', value: 4 },
      { genre: 'Pop', value: 2 }
    ],
    forbidden: ['Metal', 'Rap'],
    required: ['Jazz Standards', 'Top 40 Pop']
  },
  equipment: [
    {
      name: 'PA System',
      quantity: 1,
      price: 50
    }
  ],
  payment: {
    upfrontAmount: '1234123',
    totalPaymentDate: new Date('2024-04-06T08:30:00.000Z'),
    totalToPay: '324234234',
    partialPaymentDate: new Date('2024-04-06T08:30:00.000Z'),
    partialPayed: true,
    totalPayed: true
  },
  date: new Date('2024-04-06T08:30:00.000Z'),
  active: true,
  playlist: ['Song 1', 'Song 2', 'Song 3'],
  _id: 'evt123456789'
};

const mockedSecondEvent: EventModel = {
  fullName: 'Otro Johnson',
  phoneNumber: '123-456-7890',
  email: 'alex.johnson@example.com',
  age: '30',
  address: '123 Main St, Anytown, AT 12345',
  type: 'Sweet sixteen',
  guests: '150',
  eventAddress: '456 Park Ave, Anytown, AT 12345',
  eventCity: 'Anytown',
  salon: 'Otro Salon',
  averageAge: '30',
  eventDate: '2024-04-06T15:00:00.000Z',
  churchDate: '2024-04-06T11:00:00.000Z',
  civil: '2024-04-05T09:00:00.000Z',
  bandName: 'The Eventuals',
  manager: 'Sam Rivera',
  managerPhone: '987-654-3210',
  showtime: '20:00',
  moreData: 'This is more data',
  music: {
    genres: [
      { genre: 'Jazz', value: 4 },
      { genre: 'Pop', value: 2 }
    ],
    forbidden: ['Metal', 'Rap'],
    required: ['Jazz Standards', 'Top 40 Pop']
  },
  equipment: [
    {
      name: 'PA System',
      quantity: 1,
      price: 50
    }
  ],
  payment: {
    upfrontAmount: '1234123',
    totalPaymentDate: new Date('2024-04-06T08:30:00.000Z'),
    totalToPay: '324234234',
    partialPaymentDate: new Date('2024-04-06T08:30:00.000Z'),
    partialPayed: true,
    totalPayed: true
  },
  date: new Date('2024-04-02T04:30:00.000Z'),
  active: true,
  playlist: ['Song 1', 'Song 2', 'Song 3'],
  _id: 'evt123456788'
};

export const mockedEvents: EventsList = [mockedEvent, mockedSecondEvent];

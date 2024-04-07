'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import {
  DataverseProviderProps,
  DeganoContextProps,
  EventModel,
  EventsList,
  SelectedEventType
} from './types';
import { mockedEvents } from '@/mockedData/event';
import { usePathname } from 'next/navigation';
import axios from 'axios';
export const DeganoContext = createContext<DeganoContextProps | null>(null);

export const DeganoProvider: ({
  children
}: DataverseProviderProps) => JSX.Element = ({
  children
}: DataverseProviderProps) => {
  const [allEvents, setAllEvents] = useState<EventsList>([]);
  const pathname = usePathname();
  const [selectedEvent, setSelectedEvent] = useState<SelectedEventType | null>(
    null
  );

  const [token, setToken] = useState();

  const [activeNavTab, setActiveNavTab] = useState<number>(0);

  const [singleEventData, setSingleEventData] = useState<EventModel | null>(
    null
  );

  const [formState, setFormSted] = useState(4);

  useEffect(() => {
    setAllEvents(mockedEvents);
  }, []);

  useEffect(() => {
    const paths = {
      '/home': 0,
      '/calendar': 1,
      '/events': 2,
      '/new-event': 3,
      '/clients': 4
    };
    const path = pathname as keyof typeof paths;
    setActiveNavTab(paths[path]);
  }, [pathname]);

  useEffect(() => {
    (async () => {
      const { data } = await axios.get('/api/getSession');
      console.log(data);
    })();
  }, []);

  const contextValue = {
    selectedEvent,
    setSelectedEvent,
    activeNavTab,
    setActiveNavTab,
    setAllEvents,
    allEvents,
    singleEventData,
    setSingleEventData,
    formState,
    setFormSted
  };
  return (
    <DeganoContext.Provider value={contextValue}>
      {children}
    </DeganoContext.Provider>
  );
};

export function useDeganoCtx(): DeganoContextProps {
  const context = DeganoContext;
  if (!context) {
    console.error('Error with Degano context');
  }
  return useContext(context) as DeganoContextProps;
}

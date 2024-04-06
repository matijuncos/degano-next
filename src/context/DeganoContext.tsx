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

export const DeganoContext = createContext<DeganoContextProps | null>(null);

export const DeganoProvider: ({
  children
}: DataverseProviderProps) => JSX.Element = ({
  children
}: DataverseProviderProps) => {
  const [allEvents, setAllEvents] = useState<EventsList>([]);

  const [selectedEvent, setSelectedEvent] = useState<SelectedEventType | null>(
    null
  );

  const [activeNavTab, setActiveNavTab] = useState<number>(0);

  const [singleEventData, setSingleEventData] = useState<EventModel | null>(
    null
  );

  useEffect(() => {
    setAllEvents(mockedEvents);
  }, []);

  const contextValue = {
    selectedEvent,
    setSelectedEvent,
    activeNavTab,
    setActiveNavTab,
    setAllEvents,
    allEvents,
    singleEventData,
    setSingleEventData
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

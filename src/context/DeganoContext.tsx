'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  DataverseProviderProps,
  DeganoContextProps,
  EventModel,
  EventsList,
  SelectedEventType
} from './types';
import { usePathname } from 'next/navigation';
import { EVENT_TABS } from './config';
import useSWR from 'swr';

const eventsFetcher = (url: string) =>
  fetch(url, { cache: 'no-store' }).then((r) => r.json()).then((d) => d.events || []);

export const DeganoContext = createContext<DeganoContextProps | null>(null);

export const DeganoProvider: ({
  children
}: DataverseProviderProps) => JSX.Element = ({
  children
}: DataverseProviderProps) => {
  const { data: allEvents = [], mutate: mutateEvents } = useSWR<EventsList>(
    '/api/getEvents?page=1',
    eventsFetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000
    }
  );

  const pathname = usePathname();
  const [selectedEvent, setSelectedEvent] = useState<SelectedEventType | null>(
    null
  );

  const fetchEvents = useCallback(() => {
    mutateEvents();
  }, [mutateEvents]);

  // Función para actualizar un evento específico en la lista
  const updateEventInList = useCallback((updatedEvent: EventModel) => {
    mutateEvents(
      (current) =>
        (current || []).map((ev) =>
          ev._id === updatedEvent._id ? updatedEvent : ev
        ),
      { revalidate: false }
    );
  }, [mutateEvents]);

  // Función para agregar un evento a la lista
  const addEventToList = useCallback((newEvent: EventModel) => {
    mutateEvents(
      (current) => [...(current || []), newEvent],
      { revalidate: false }
    );
  }, [mutateEvents]);

  const setAllEvents = useCallback((events: EventsList) => {
    mutateEvents(events, { revalidate: false });
  }, [mutateEvents]);

  const [loading, setLoading] = useState(false);

  const [activeNavTab, setActiveNavTab] = useState<number>(4);

  const [singleEventData, setSingleEventData] = useState<EventModel | null>(
    null
  );

  const [formState, setFormState] = useState(EVENT_TABS.CLIENT);

  const [validate, setValidate] = useState(false);

  useEffect(() => {
    const paths = {
      '/home': 0,
      '/calendar': 1,
      '/events': 2,
      '/clients': 3,
      '/new-event': 4
    };
    const path = pathname as keyof typeof paths;
    setActiveNavTab(paths[path]);
  }, [pathname]);

  const [folderName, setFolderName] = useState('untitled');
  const [authToken, setAuthToken] = useState('');

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
    setFormState,
    validate,
    setValidate,
    fetchEvents,
    loading,
    setLoading,
    folderName,
    setFolderName,
    authToken,
    setAuthToken,
    updateEventInList,
    addEventToList
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

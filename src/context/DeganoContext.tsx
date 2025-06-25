'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import {
  DataverseProviderProps,
  DeganoContextProps,
  EventModel,
  EventsList,
  SelectedEventType
} from './types';
import { usePathname } from 'next/navigation';
import { EVENT_TABS } from './config';

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

  const fetchEvents = async () => {
    const timestamp = Date.parse(new Date().toString());

    try {
      const response = await fetch(`/api/getEvents?page=1&time=${timestamp}`, {
        cache: 'no-store'
      });
      const data = await response.json();
      setAllEvents(data.events);
    } catch (error) {
      console.error('Failed to fetch movies:', error);
    }
  };
  useEffect(() => {
    fetchEvents();
  }, []);

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
    setAuthToken
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

'use client';
import {
  IconCalendar,
  IconCalendarPlus,
  IconHome,
  IconPlus,
  IconUser
} from '@tabler/icons-react';
import styles from './BottomNavBar.module.css';
import { useDeganoCtx } from '@/context/DeganoContext';
import React, { useEffect } from 'react';
const BottomNavBar = () => {
  const { setActiveNavTab, activeNavTab } = useDeganoCtx();
  const tiles: { label: string; path: string; Icon: JSX.Element }[] = [
    {
      label: 'Inicio',
      path: '/home',
      Icon: <IconHome color='white' />
    },
    {
      label: 'Calendario',
      path: '/calendar',
      Icon: <IconCalendar color='white' />
    },
    {
      label: 'Eventos',
      path: '/events',
      Icon: <IconCalendarPlus color='white' />
    },

    { label: 'Clientes', path: '/clients', Icon: <IconUser color='white' /> },
    {
      label: 'Crear Evento',
      path: '/new-event',
      Icon: <IconPlus color='white' />
    }
  ];

  const handleButtonClick = (index: number): void => {
    setActiveNavTab(index);
  };

  return (
    <div className={styles.navbar_container}>
      {tiles.map(({ Icon, path }, idx) => (
        <div
          onClick={() => handleButtonClick(idx)}
          className={
            activeNavTab === idx
              ? `${styles.navbar_button} ${styles.navbar_button_active}`
              : styles.navbar_button
          }
          key={path}
        >
          {React.cloneElement(Icon, {
            color: activeNavTab === idx ? 'green' : 'white' // Change 'red' to your active color
          })}
        </div>
      ))}
    </div>
  );
};

export default BottomNavBar;
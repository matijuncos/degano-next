'use client';
import {
  IconCalendar,
  IconHome,
  IconListCheck,
  IconPlus,
  IconUser
} from '@tabler/icons-react';
import styles from './BottomNavBar.module.css';
import { useDeganoCtx } from '@/context/DeganoContext';
import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
const BottomNavBar = () => {
  const router = useRouter();
  const { activeNavTab } = useDeganoCtx();
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
      Icon: <IconListCheck color='white' />
    },

    { label: 'Clientes', path: '/clients', Icon: <IconUser color='white' /> },
    {
      label: 'Crear Evento',
      path: '/new-event',
      Icon: <IconPlus color='white' />
    }
  ];

  const handleButtonClick = (path: string): void => {
    router.push(path);
  };

  return (
    <div className={styles.navbar_container}>
      {tiles.map(({ Icon, path }, idx) => (
        <div
          onClick={() => handleButtonClick(path)}
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

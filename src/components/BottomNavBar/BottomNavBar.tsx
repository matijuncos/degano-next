'use client';
import {
  IconCalendar,
  IconHome,
  IconListCheck,
  IconMusic,
  IconPlus,
  IconUser
} from '@tabler/icons-react';
import styles from './BottomNavBar.module.css';
import { useDeganoCtx } from '@/context/DeganoContext';
import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import useLoadingCursor from '@/hooks/useLoadingCursor';
const BottomNavBar = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { activeNavTab } = useDeganoCtx();
  const setLoadingCursor = useLoadingCursor();

  // Desactivar loading cuando cambia la ruta
  useEffect(() => {
    setLoadingCursor(false);
  }, [pathname]);
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
    },
    {
      label: 'Géneros de música',
      path: '/genres',
      Icon: <IconMusic color='white' />
    }
  ];

  const handleButtonClick = (path: string): void => {
    setLoadingCursor(true);
    router.push(path);

    // Timeout de seguridad: quitar loading después de 5 segundos
    setTimeout(() => {
      setLoadingCursor(false);
    }, 5000);
  };

  return (
    <div className={`${styles.navbar_container} navbar-to-show`}>
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
            color: activeNavTab === idx ? 'green' : 'white'
          })}
        </div>
      ))}
    </div>
  );
};

export default BottomNavBar;

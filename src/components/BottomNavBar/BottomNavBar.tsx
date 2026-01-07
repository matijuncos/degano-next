'use client';
import {
  IconCalendar,
  IconHome,
  IconListCheck,
  IconMusic,
  IconPlus,
  IconUser,
  IconLogout
} from '@tabler/icons-react';
import styles from './BottomNavBar.module.css';
import { useDeganoCtx } from '@/context/DeganoContext';
import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import useLoadingCursor from '@/hooks/useLoadingCursor';
import { useUser } from '@auth0/nextjs-auth0/client';
import { usePermissions } from '@/hooks/usePermissions';

const BottomNavBar = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { activeNavTab } = useDeganoCtx();
  const setLoadingCursor = useLoadingCursor();
  const { user } = useUser();
  const { can } = usePermissions();

  // Desactivar loading cuando cambia la ruta
  useEffect(() => {
    setLoadingCursor(false);
  }, [pathname]);

  const allTiles: { label: string; path: string; Icon: JSX.Element }[] = [
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
    },
    {
      label: 'Cerrar sesión',
      path: '/api/auth/logout',
      Icon: <IconLogout color='white' />
    }
  ];

  // Filtrar tiles según permisos
  const tiles = user ? allTiles.filter(tile => {
    if (tile.path === '/clients') {
      return can('canViewClients');
    }
    if (tile.path === '/new-event') {
      return can('canCreateEvents');
    }
    // Todos los demás tiles son accesibles para todos
    return true;
  }) : [];

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

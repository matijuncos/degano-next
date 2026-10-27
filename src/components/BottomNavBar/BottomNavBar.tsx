'use client';
import {
  IconCalendar,
  IconHome,
  IconListCheck,
  IconMusic,
  IconPlus,
  IconUser,
  IconLogout,
  IconMapPin,
  IconLayoutKanban,
  IconCash,
  IconReceipt,
  IconDots
} from '@tabler/icons-react';
import { Menu } from '@mantine/core';
import styles from './BottomNavBar.module.css';
import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import useLoadingCursor from '@/hooks/useLoadingCursor';
import { useUser } from '@auth0/nextjs-auth0/client';
import { usePermissions } from '@/hooks/usePermissions';
import { useMyEmployee } from '@/hooks/useMyEmployee';

type Tile = { label: string; path: string; Icon: typeof IconHome };

// Barra de abajo en celular. Lo principal va como ícono; lo secundario en
// "Más" (no entran todos los íconos en una pantalla angosta). Los permisos son
// los mismos que en el menú de escritorio (NavBar).
const BottomNavBar = () => {
  const router = useRouter();
  const pathname = usePathname();
  const setLoadingCursor = useLoadingCursor();
  const { user } = useUser();
  const { can, isAdmin, isManager } = usePermissions();
  const { employee } = useMyEmployee();

  // Desactivar loading cuando cambia la ruta
  useEffect(() => {
    setLoadingCursor(false);
  }, [pathname]);

  const main: Tile[] = [
    { label: 'Inicio', path: '/home', Icon: IconHome },
    { label: 'Calendario', path: '/calendar', Icon: IconCalendar },
    { label: 'Eventos', path: '/events', Icon: IconListCheck },
    ...(can('canViewClients') ? [{ label: 'Clientes', path: '/clients', Icon: IconUser }] : []),
    ...(can('canCreateEvents') ? [{ label: 'Crear Evento', path: '/new-event', Icon: IconPlus }] : [])
  ];

  const more: Tile[] = [
    { label: 'Géneros de música', path: '/genres', Icon: IconMusic },
    // Lugares: lo ven admin y manager (solo el admin modifica)
    ...(isAdmin || isManager ? [{ label: 'Lugares', path: '/lugares', Icon: IconMapPin }] : []),
    { label: 'Comunicación interna', path: '/tableros', Icon: IconLayoutKanban },
    // Plata: solo admin
    ...(can('canEditPayments') ? [{ label: 'Cobros STAFF', path: '/cobros-staff', Icon: IconCash }] : []),
    // Solo quien está vinculado a un registro de STAFF
    ...(employee?.isStaff ? [{ label: 'Mis cobros', path: '/mis-cobros', Icon: IconReceipt }] : [])
  ];

  if (!user) return <div className={`${styles.navbar_container} navbar-to-show`} />;

  const isActive = (path: string) => pathname === path || !!pathname?.startsWith(`${path}/`);
  const moreActive = more.some((t) => isActive(t.path));

  const go = (path: string): void => {
    if (isActive(path)) return;
    setLoadingCursor(true);
    router.push(path);
    // Timeout de seguridad: quitar loading después de 5 segundos
    setTimeout(() => setLoadingCursor(false), 5000);
  };

  return (
    <div className={`${styles.navbar_container} navbar-to-show`}>
      {main.map(({ Icon, path, label }) => (
        <div
          onClick={() => go(path)}
          className={isActive(path) ? `${styles.navbar_button} ${styles.navbar_button_active}` : styles.navbar_button}
          key={path}
          role='button'
          aria-label={label}
        >
          <Icon color={isActive(path) ? 'green' : 'white'} />
        </div>
      ))}

      <Menu position='top-end' offset={8} withinPortal shadow='md' width={230}>
        <Menu.Target>
          <div
            className={moreActive ? `${styles.navbar_button} ${styles.navbar_button_active}` : styles.navbar_button}
            role='button'
            aria-label='Más'
          >
            <IconDots color={moreActive ? 'green' : 'white'} />
          </div>
        </Menu.Target>
        <Menu.Dropdown>
          {more.map(({ Icon, path, label }) => (
            <Menu.Item
              key={path}
              leftSection={<Icon size={18} />}
              color={isActive(path) ? 'green' : undefined}
              onClick={() => go(path)}
            >
              {label}
            </Menu.Item>
          ))}
          <Menu.Divider />
          <Menu.Item leftSection={<IconLogout size={18} />} color='red' onClick={() => router.push('/api/auth/logout')}>
            Cerrar sesión
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>
    </div>
  );
};

export default BottomNavBar;

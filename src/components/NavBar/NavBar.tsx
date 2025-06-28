'use client';
import { Center, Tooltip, UnstyledButton, Stack, rem } from '@mantine/core';
import {
  IconHome2,
  IconUser,
  IconLogout,
  IconCalendar,
  IconPlus,
  IconHome,
  IconListCheck,
  IconMusic
} from '@tabler/icons-react';
import degano from '../../assets/logo.png';
import classes from './Navbar.module.css';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import { useDeganoCtx } from '@/context/DeganoContext';
import { useUser } from '@auth0/nextjs-auth0/client';
import useLoadingCursor from '@/hooks/useLoadingCursor';

interface NavbarLinkProps {
  icon: typeof IconHome2;
  label: string;
  active?: boolean;
  onClick?(): void;
}

function NavbarLink({ icon: Icon, label, active, onClick }: NavbarLinkProps) {
  return (
    <Tooltip label={label} position='right' transitionProps={{ duration: 0 }}>
      <UnstyledButton
        onClick={onClick}
        className={classes.link}
        data-active={active || undefined}
      >
        <Icon style={{ width: rem(20), height: rem(20) }} stroke={1.5} />
      </UnstyledButton>
    </Tooltip>
  );
}

const linksList = [
  { icon: IconHome, label: 'Inicio', path: '/home' },
  { icon: IconCalendar, label: 'Calendario', path: '/calendar' },
  { icon: IconListCheck, label: 'Eventos', path: '/events' },
  { icon: IconUser, label: 'Clientes', path: '/clients' },
  { icon: IconPlus, label: 'Nuevo evento', path: '/new-event' },
  { icon: IconMusic, label: 'Géneros de música', path: '/genres' }
];

function Navbar() {
  const router = useRouter();
  const { user } = useUser();
  const { activeNavTab } = useDeganoCtx();
  const setLoadingCursor = useLoadingCursor();
  const pathname = usePathname();

  const handleOnClick = (route: string) => {
    if (pathname !== route) {
      setLoadingCursor(true);
      router.push(route);
    }
  };

  const links = user ? (
    linksList.map((link, index) => (
      <NavbarLink
        {...link}
        key={link.label}
        active={index === activeNavTab}
        onClick={() => handleOnClick(link.path)}
      />
    ))
  ) : (
    <></>
  );

  return (
    <nav className={classes.navbar}>
      <Center>
        <Image
          style={{ borderRadius: '100%', cursor: 'pointer' }}
          src={degano}
          alt='Next.js Logo'
          width={30}
          height={30}
          priority
          onClick={() => handleOnClick('/home')}
        />
      </Center>

      <div className={classes.navbarMain}>
        <Stack justify='center' gap={0}>
          {links}
        </Stack>
      </div>
      {user && (
        <Stack justify='center' gap={0}>
          <NavbarLink
            icon={IconLogout}
            label='Cerrar sesión'
            onClick={() => handleOnClick('/api/auth/logout')}
          />
        </Stack>
      )}
    </nav>
  );
}

export default Navbar;

'use client';
import { Center, Tooltip, UnstyledButton, Stack, rem } from '@mantine/core';
import {
  IconHome2,
  IconUser,
  IconLogout,
  IconCalendar,
  IconPlus,
  IconCalendarPlus,
  IconHome
} from '@tabler/icons-react';
import degano from '../../assets/logo.png';
import classes from './Navbar.module.css';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useDeganoCtx } from '@/context/DeganoContext';
import { useUser } from '@auth0/nextjs-auth0/client';

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
  { icon: IconCalendarPlus, label: 'Eventos', path: '/events' },
  { icon: IconPlus, label: 'Nuevo evento', path: '/new-event' },
  { icon: IconUser, label: 'Clientes', path: '/clients' }
];

function Navbar() {
  const router = useRouter();
  const { user } = useUser();
  const { activeNavTab, setActiveNavTab } = useDeganoCtx();

  const links = user ? (
    linksList.map((link, index) => (
      <NavbarLink
        {...link}
        key={link.label}
        active={index === activeNavTab}
        onClick={() => {
          setActiveNavTab(index);
          router.push(link.path);
        }}
      />
    ))
  ) : (
    <></>
  );

  return (
    <nav className={classes.navbar}>
      <Center>
        <Image
          style={{ borderRadius: '100%' }}
          src={degano}
          alt='Next.js Logo'
          width={30}
          height={30}
          priority
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
            onClick={() => router.push('/api/auth/logout')}
          />
        </Stack>
      )}
    </nav>
  );
}

export default Navbar;
'use client';
import Image from 'next/image';
import styles from './Login.module.css';
import logo from '../assets/logo.png';
import { useRouter } from 'next/navigation';
import { useUser } from '@auth0/nextjs-auth0/client';
import { Button, Loader } from '@mantine/core';
import { useEffect } from 'react';

// Pantalla de inicio de sesión: todo centrado en la pantalla visible, con el
// botón justo debajo del logo (en el celular no hay que scrollear).
export default function Home() {
  const router = useRouter();
  const { user, isLoading } = useUser();
  const navigate = () => {
    router.push('/api/auth/login');
  };
  useEffect(() => {
    if (!isLoading && user) {
      router.replace('/home');
    }
  }, [user, isLoading, router]);

  // La pantalla va fija encima de todo: se bloquea el scroll de la página de
  // fondo (si no, en el celular "rebota" por el espacio de la barra de abajo)
  useEffect(() => {
    const html = document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = 'hidden';
    return () => {
      html.style.overflow = prev;
    };
  }, []);

  if (isLoading || user) {
    return (
      <main className={styles.screen}>
        <Loader color='green' />
      </main>
    );
  }

  return (
    <main className={styles.screen}>
      <div className={styles.card}>
        <div>
          <h1 className={styles.title}>Degano</h1>
          <h2 className={styles.subtitle}>Shows & Events</h2>
        </div>
        <Image src={logo} alt='logo degano' className={styles.logo} width={200} height={200} priority />
        <Button onClick={navigate} color='green' size='md' fullWidth>
          Iniciar Sesión
        </Button>
      </div>
    </main>
  );
}

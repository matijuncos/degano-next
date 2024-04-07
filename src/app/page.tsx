'use client';
import Image from 'next/image';
import styles from './page.module.css';
import partyImg from '../assets/partyjpg.jpg';
import logo from '../assets/logo.png';
import { useRouter } from 'next/navigation';
import { useUser } from '@auth0/nextjs-auth0/client';
import { Button } from '@mantine/core';
import { useEffect } from 'react';

export default function Home() {
  const router = useRouter();
  const { user, isLoading } = useUser();
  console.log(user);
  const navigate = () => {
    router.push('/api/auth/login');
  };
  useEffect(() => {
    if (!isLoading && user) {
      router.replace('/home');
    }
  }, [user, isLoading, router]);

  if (isLoading) return <div>Loading...</div>;

  return (
    <main className={styles.main}>
      <>
        <div className={styles.page_container}>
          <div className={styles.flex_container}>
            <div>
              <h1>Degano</h1>
              <h2>Iluminación y sonido</h2>
            </div>
            <div
              style={{
                alignSelf: 'center',
                justifySelf: 'center',
                margin: 'auto'
              }}
            >
              <Image
                src={logo}
                alt='logo degano'
                width={200}
                height={200}
                priority
              />
            </div>
            <Button onClick={navigate} m='auto' bg='green' w='18em'>
              Iniciar Sesión
            </Button>
          </div>
          <div className={styles.grid_layout}></div>
        </div>
      </>
    </main>
  );
}

'use client';
import Image from 'next/image';
import styles from './page.module.css';
import partyImg from '../assets/partyjpg.jpg';
import degano from '../assets/logo.png';
import { useRouter } from 'next/navigation';
import { useUser } from '@auth0/nextjs-auth0/client';
import { Button } from '@mantine/core';
export default function Home() {
  const router = useRouter();
  const { user } = useUser();

  const navigate = () => {
    router.push('/api/auth/login');
  };
  return (
    <main className={styles.main}>
      <div className={styles.description}>
        <Button onClick={navigate}>Iniciar sesión</Button>
        <div>
          <Image
            src={degano}
            alt='Next.js Logo'
            width={100}
            height={100}
            priority
          />
        </div>
        <div>By{'Gauchos <dev/>'}</div>
      </div>
      <div className={styles.center}>
        <Image
          src={partyImg}
          alt='Next.js Logo'
          width={800}
          layout='responsive'
          height={800}
          priority
        />
      </div>
    </main>
  );
}

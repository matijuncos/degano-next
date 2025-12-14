'use client';
import { withPageAuthRequired } from '@auth0/nextjs-auth0/client';
import Image from 'next/image';
import logo from '../../assets/logo.png';
import HomeTile from '@/components/HomeTile/HomeTile';
import {
  IconCalendar,
  IconCheckupList,
  IconListCheck,
  IconMusic,
  IconPlus,
  IconUser,
  IconUsers,
  IconVinyl
} from '@tabler/icons-react';
import NextEvents from '@/components/NextEvents/NextEvents';
import styles from './HomePage.module.css';
import { motion } from 'framer-motion';
import { useEffect } from 'react';
import useLoadingCursor from '@/hooks/useLoadingCursor';

const Home = () => {
  const setLoadingCursor = useLoadingCursor();
  const tiles = [
    {
      label: 'Calendario',
      path: '/calendar',
      Icon: IconCalendar
    },
    {
      label: 'Eventos',
      path: '/events',
      Icon: IconListCheck
    },
    { label: 'Clientes', path: '/clients', Icon: IconUser },
    {
      label: 'Crear Evento',
      path: '/new-event',
      Icon: IconPlus
    },
    {
      label: 'Administrar Stock',
      path: '/equipment',
      Icon: IconCheckupList
    },
    {
      label: 'Géneros de música',
      path: '/genres',
      Icon: IconMusic
    },
    {
      label: 'Staff',
      path: '/staff',
      Icon: IconUsers
    },
    {
      label: 'Bandas',
      path: '/bands',
      Icon: IconVinyl
    }
  ];
  const itemVariants = {
    hidden: { x: -200, opacity: 0 },
    visible: {
      x: 0,
      opacity: 1,
      transition: {
        duration: 0.5
      }
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2
      }
    }
  };

  useEffect(() => {
    setLoadingCursor(false);
  }, []);

  return (
    <>
      <div className={styles.page_container}>
        <motion.div
          initial='hidden'
          animate='visible'
          variants={itemVariants}
          className={styles.flex_container}
        >
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
        </motion.div>
        <motion.div
          variants={containerVariants}
          initial='hidden'
          animate='visible'
          className={styles.grid_layout}
        >
          {tiles.map((tile) => (
            <HomeTile {...tile} key={tile.path} />
          ))}
          <div className={styles.next_events}>
            <h2>Proximos eventos</h2>
            <div
              style={{
                borderRadius: '20px',
                height: '100%'
              }}
            >
              <NextEvents />
            </div>
          </div>
        </motion.div>
      </div>
    </>
  );
};

export default withPageAuthRequired(Home);

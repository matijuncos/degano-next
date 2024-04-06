import Image from 'next/image';
import logo from '../../assets/logo.png';
import HomeTile from '@/components/HomeTile/HomeTile';
import {
  IconCalendar,
  IconCalendarPlus,
  IconPlus,
  IconUser
} from '@tabler/icons-react';
import NextEvents from '@/components/NextEvents/NextEvents';
import styles from './HomePage.module.css';
const Home = () => {
  const getTiles = () => {
    return [
      {
        label: 'Calendario',
        path: '/calendar',
        Icon: IconCalendar
      },
      {
        label: 'Eventos',
        path: '/events',
        Icon: IconCalendarPlus
      },
      { label: 'Clientes', path: '/clients', Icon: IconUser },
      {
        label: 'Crear Evento',
        path: '/new-event',
        Icon: IconPlus
      }
    ];
  };

  return (
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
        </div>
        <div className={styles.grid_layout}>
          {getTiles().map((tile) => (
            <HomeTile key={tile.path} {...tile} />
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
        </div>
      </div>
    </>
  );
};

export default Home;

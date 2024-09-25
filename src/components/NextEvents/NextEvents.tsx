'use client';
import { useDeganoCtx } from '@/context/DeganoContext';
import { IconArrowRight } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import useLoadingCursor from '@/hooks/useLoadingCursor';
import styles from './NextEvents.module.css';

const NextEvents = () => {
  const setLoadingCursor = useLoadingCursor();
  const { allEvents } = useDeganoCtx();

  const router = useRouter();
  
  const handleClick = async (id: string) => {
    setLoadingCursor(true);
    router.push(`/event/${id}`);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 1); // Set to the start of today

  const sortedFutureEvents = allEvents
    ?.filter((event) => new Date(event.date) >= today)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 7);

  return (
    <div style={{ padding: '0px' }}>
      {sortedFutureEvents?.map((event, idx) => {
        const isLastItem =
          idx === sortedFutureEvents.length - 1 &&
          sortedFutureEvents.length > 1;

        const borders = !isLastItem
          ? { borderBottom: 'solid 3px #242424' }
          : {};
        const itemVariants = {
          hidden: { x: 200, opacity: 0 },
          visible: {
            x: 0,
            opacity: 1,
            transition: {
              duration: 0.5
            }
          }
        };
        return (
          <motion.div
            variants={itemVariants}
            key={event._id}
            onClick={() => handleClick(event._id)}
            style={{
              display: 'flex',
              padding: '8px 8px',
              justifyContent: 'space-between',
              cursor: 'pointer',
              backgroundColor: 'rgba(100,100,100,0.3)',
              ...borders
            }}
            whileHover={{
              scale: 1.02,
              transition: { duration: 0.3 }
            }}
            className={styles.nextEvents}
          >
            <div
              style={{
                display: 'flex',
                gap: '4px'
              }}
            >
              <p>{event.salon} - </p>
              <p>{new Date(event.date).toLocaleDateString()}</p>
            </div>
            <IconArrowRight />
          </motion.div>
        );
      })}
    </div>
  );
};
export default NextEvents;

'use client';
import { useDeganoCtx } from '@/context/DeganoContext';
import { IconArrowRight } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import styles from './NextEvents.module.css';
const NextEvents = () => {
  const { allEvents } = useDeganoCtx();
  const router = useRouter();
  return (
    <div style={{ padding: '0px' }}>
      {allEvents.slice(0, 7).map((event, idx) => {
        const isLastItem = idx === allEvents.length - 1 && allEvents.length > 1;

        const borders = !isLastItem
          ? { borderBottom: 'solid 3px #242424' }
          : {};
        const itemVariants = {
          hidden: { x: 200, opacity: 0 },
          visible: {
            x: 0,
            opacity: 1,
            transition: {
              duration: 0.5 // Duration of the animation
            }
          }
        };
        return (
          <motion.div
            variants={itemVariants}
            key={event._id}
            onClick={() => router.push(`/event/${event._id}`)}
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

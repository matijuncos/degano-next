import { IconArrowRight } from '@tabler/icons-react';
import Link from 'next/link';
import styles from './HomeTile.module.css';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { useUser } from '@auth0/nextjs-auth0/client';
import NoAccessTile from '../NoAccessTile/NoAccessTile';

const HomeTile = ({
  label,
  path,
  Icon
}: {
  label: string;
  path: string;
  Icon: any;
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const { user } = useUser();
  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.5
      }
    }
  };

  const isForbidden =
    isHovered && user?.role !== 'admin' && path === '/clients';
  return (
    <motion.div
      className={`${styles.home_tile} ${isForbidden ? styles.blurry : ''}`}
      variants={itemVariants}
      onMouseLeave={() => setIsHovered(false)}
      onMouseEnter={() => setIsHovered(true)}
    >
      {isForbidden && (
        <div className={styles.noAccessOverlay}>
          <NoAccessTile />
        </div>
      )}
      <Link href={path} style={isForbidden ? { pointerEvents: 'none' } : {}}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'right',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <p style={{ fontSize: '12px' }}>Acceder</p>
          <IconArrowRight size={16} />
        </div>
        {<Icon />}
        <h3>{label}</h3>
      </Link>
    </motion.div>
  );
};

export default HomeTile;

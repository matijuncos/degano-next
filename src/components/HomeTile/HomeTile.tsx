import { IconArrowRight } from '@tabler/icons-react';
import Link from 'next/link';
import styles from './HomeTile.module.css';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { useUser } from '@auth0/nextjs-auth0/client';
import NoAccessTile from '../NoAccessTile/NoAccessTile';
import { Box } from '@mantine/core';
import { useRouter } from 'next/navigation';
import useLoadingCursor from '@/hooks/useLoadingCursor';

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
  const router = useRouter();
  const setLoadingCursor = useLoadingCursor();
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

  const restrictedPaths = ['/clients', '/equipment-stock-v2'];

  const isForbidden =
    isHovered && user?.role !== 'admin' && restrictedPaths.includes(path);

  const navigate = (path: string) => {
    setLoadingCursor(true);
    router.push(path);
  };

  return (
    <motion.div
      className={`${styles.home_tile} ${isForbidden ? styles.blurry : ''}`}
      variants={itemVariants}
      onMouseLeave={() => setIsHovered(false)}
      onMouseEnter={() => setIsHovered(true)}
      onClick={isForbidden ? undefined : () => navigate(path)}
    >
      {isForbidden && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className={styles.noAccessOverlay}
        >
          <NoAccessTile />
        </motion.div>
      )}
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
    </motion.div>
  );
};

export default HomeTile;

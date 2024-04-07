import { IconArrowRight } from '@tabler/icons-react';
import Link from 'next/link';
import styles from './HomeTile.module.css';
import { motion } from 'framer-motion';

const HomeTile = ({
  label,
  path,
  Icon
}: {
  label: string;
  path: string;
  Icon: any;
}) => {
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
  return (
    <motion.div className={styles.home_tile} variants={itemVariants}>
      <Link href={path}>
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

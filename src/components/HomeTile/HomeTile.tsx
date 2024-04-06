import { IconArrowRight } from '@tabler/icons-react';
import Link from 'next/link';
import styles from './HomeTile.module.css';
const HomeTile = ({
  label,
  path,
  Icon
}: {
  label: string;
  path: string;
  Icon: any;
}) => {
  return (
    <Link href={path} className={styles.home_tile}>
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
  );
};

export default HomeTile;

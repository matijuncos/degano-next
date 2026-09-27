import { Button } from '@mantine/core';
import { IconMapPin } from '@tabler/icons-react';
import { normalizeMapsUrl } from '@/utils/mapsUtils';

// Botón para abrir la ubicación del lugar en Google Maps (nueva pestaña / app en el celular).
const VenueMapsButton = ({ url }: { url?: string }) => {
  const href = normalizeMapsUrl(url);
  if (!href) return null;
  return (
    <Button
      component='a'
      href={href}
      target='_blank'
      rel='noopener noreferrer'
      variant='light'
      size='xs'
      leftSection={<IconMapPin size={16} />}
      mb='sm'
    >
      Abrir en Google Maps
    </Button>
  );
};

export default VenueMapsButton;

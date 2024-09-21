import { useCallback } from 'react';
import { notifications } from '@mantine/notifications';
import { IconCheck, IconX } from '@tabler/icons-react';

const useNotification = () => {
  const notify = useCallback(
    (
      title = 'Operación exitosa',
      message = 'Se ha guardado correctamente',
      color = 'teal',
      loading = false
    ) => {
      if (loading) {
        notifications.show({
          id: 'notify-notification',
          loading,
          title: 'Cargando...',
          message: 'Por favor espera mientras se procesa la operación',
          color: 'blue',
          autoClose: false,
          withCloseButton: false
        });
      } else {
        notifications.update({
          id: 'notify-notification',
          loading,
          title,
          message,
          color,
          icon: color === 'teal' ? <IconCheck /> : <IconX />,
          autoClose: 4000,
          withCloseButton: true
        });
      }
    },
    []
  );
  return notify;
};

export default useNotification;

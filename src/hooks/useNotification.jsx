import { useCallback } from 'react';
import { notifications } from '@mantine/notifications';
import { IconCheck, IconX } from '@tabler/icons-react';

const useNotification = () => {
  const notify = useCallback(
    /** @param {{ title?: string, message?: string, color?: string, type?: string, loading?: boolean }} [opts] */
    ({
      title = 'Operación exitosa',
      message,
      color = 'teal',
      type = 'success',
      loading = false
    } = {}) => {
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
        let notificationProps = {
          id: 'notify-notification',
          loading,
          title,
          message: message ?? 'Se ha guardado correctamente',
          color,
          icon: color === 'teal' ? <IconCheck /> : <IconX />,
          autoClose: 4000,
          withCloseButton: true
        };

        if (type === 'defaultError') {
          notificationProps = {
            ...notificationProps,
            title: 'Operación errónea',
            // Si se pasa un mensaje (ej. el error real del servidor) se muestra ese
            message: message ?? 'Algo salió mal, vuelve a intentarlo',
            autoClose: message ? 8000 : 4000,
            color: 'red',
            icon: <IconX />,
          };
        }
        notifications.update(notificationProps);
      }
    },
    []
  );
  return notify;
};

export default useNotification;

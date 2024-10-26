'use client';
import { useDeganoCtx } from '@/context/DeganoContext';
import useLoadingCursor from '@/hooks/useLoadingCursor';
import { DrawerHeader, NavLink } from '@mantine/core';
import { useRouter } from 'next/navigation';

const DrawerContent = () => {
  const { selectedEvent, setActiveNavTab } = useDeganoCtx();
  const router = useRouter();
  const setLoadingCursor = useLoadingCursor();
  return (
    <>
      <DrawerHeader>
        <h3>{selectedEvent?.fullName}</h3>
      </DrawerHeader>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: '78vh',
          maxHeight: '78vh'
        }}
      >
        <div>
          <p style={{ padding: '8px 12px' }}>
            Fecha:{' '}
            {selectedEvent?.start
              ? new Date(selectedEvent.start ?? '').toLocaleDateString(
                  'es-AR',
                  {
                    weekday: 'long',
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric'
                  }
                )
              : 'N/A'}
          </p>
          <p style={{ padding: '8px 12px' }}>
            Hora Inicio:{' '}
            {new Date(selectedEvent?.start ?? '').toLocaleTimeString('es-AR', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: false
            })}
          </p>
          <p style={{ padding: '8px 12px' }}>
            Contacto: {selectedEvent?.phoneNumber}
          </p>
          <p style={{ padding: '8px 12px' }}>Salón: {selectedEvent?.salon}</p>
          <p style={{ padding: '8px 12px' }}>
            Localidad: {selectedEvent?.eventCity}
          </p>
          <p style={{ padding: '8px 12px' }}>
            Dirección: {selectedEvent?.address}
          </p>
          <p style={{ padding: '8px 12px' }}>
            Más Información: {selectedEvent?.moreData}
          </p>
        </div>
        <div>
          <NavLink
            active
            onClick={() => {setLoadingCursor(true); router.push(`/event/${selectedEvent?._id}`)}}
            label='Ver Evento'
          ></NavLink>
        </div>
      </div>
    </>
  );
};
export default DrawerContent;

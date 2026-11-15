// src/components/ArrivalLeadWarning/ArrivalLeadWarning.tsx
// Aviso cuando la llegada del equipamiento es más de MAX_ARRIVAL_LEAD_DAYS antes
// del evento: hasta que se confirma, los equipos se reservan desde el INICIO del
// evento (protege de errores de tipeo, ej. un mes antes). Al confirmar se guarda
// para qué fechas (`equipmentArrivalConfirmedFor`): si cambian, se vuelve a pedir.
// Lo usan Nuevo evento (pestaña Evento) y la página del evento.
'use client';
import { Alert, Button, Group, Text } from '@mantine/core';
import { IconTruckDelivery } from '@tabler/icons-react';
import {
  MAX_ARRIVAL_LEAD_DAYS,
  arDateTimeLabel,
  arrivalConfirmKey,
  arrivalLeadDays,
  arrivalStart,
  needsArrivalConfirm,
  ArrivalFields
} from '@/utils/reservationRange';

export default function ArrivalLeadWarning({
  event,
  onConfirm,
  loading = false
}: {
  event: ArrivalFields;
  onConfirm: (confirmKey: string) => void; // guarda equipmentArrivalConfirmedFor
  loading?: boolean;
}) {
  if (!needsArrivalConfirm(event)) return null;
  const arrival = arrivalStart(event);
  const days = arrivalLeadDays(event);
  return (
    <Alert color='yellow' variant='light' icon={<IconTruckDelivery size={18} />} mb='sm'>
      <Text size='sm'>
        La llegada del equipamiento es el <b>{arDateTimeLabel(arrival)}</b>, <b>{days} días antes</b> del evento (
        {arDateTimeLabel(event.date)}). Es más de {MAX_ARRIVAL_LEAD_DAYS} días: revisá que la fecha esté bien.
      </Text>
      <Text size='xs' c='dimmed' mt={4}>
        Hasta que lo confirmes, los equipos se reservan desde el inicio del evento.
      </Text>
      <Group gap='xs' mt='xs'>
        <Button size='compact-sm' color='yellow' loading={loading} onClick={() => onConfirm(arrivalConfirmKey(event))}>
          Confirmar: reservar desde el {arDateTimeLabel(arrival)}
        </Button>
        <Text size='xs' c='dimmed'>o corregí la fecha de llegada</Text>
      </Group>
    </Alert>
  );
}

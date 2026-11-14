// src/components/EventKindChooser/RentalBadge.tsx
// Cartel "Alquiler" (cobre, el color de los alquileres en el calendario).
// Lo usan el formulario, la página del evento y las listas.
'use client';
import { Badge, BadgeProps } from '@mantine/core';
import { IconTruck } from '@tabler/icons-react';
import { rentalEventColors } from '@/utils/eventKind';

// Mismo cobre que el calendario (estado "futuro")
export const RENTAL_ACCENT = rentalEventColors('future').backgroundColor;

export default function RentalBadge(props: Omit<BadgeProps, 'color' | 'leftSection'>) {
  return (
    <Badge
      color={RENTAL_ACCENT}
      variant='filled'
      tt='none'
      leftSection={<IconTruck size={12} />}
      {...props}
    >
      Alquiler
    </Badge>
  );
}

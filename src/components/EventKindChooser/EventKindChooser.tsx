// src/components/EventKindChooser/EventKindChooser.tsx
// Primer paso de "Crear evento": elegir Evento o Alquiler. El alquiler es un
// evento completo (equipos, staff, presupuesto) sin Show, Música, Timing ni
// Archivos. Ver utils/eventKind.ts
'use client';
import { Paper, SimpleGrid, Stack, Text, ThemeIcon, UnstyledButton, Title, Badge } from '@mantine/core';
import { IconConfetti, IconTruck } from '@tabler/icons-react';
import { EventKind } from '@/utils/eventKind';

// Ícono: fondo suave + ícono claro (la variante "light" de Mantine con un color
// propio quedaba casi invisible sobre el fondo oscuro).
const OPTIONS: { kind: EventKind; title: string; description: string; icon: React.ReactNode; iconStyle: React.CSSProperties }[] = [
  {
    kind: 'evento',
    title: 'Evento',
    description: 'Con show, música, timing y archivos',
    icon: <IconConfetti size={30} />,
    iconStyle: { backgroundColor: 'rgba(55, 178, 77, 0.18)', color: '#69db7c' }
  },
  {
    kind: 'alquiler',
    title: 'Alquiler',
    description: 'Equipos, staff y presupuesto',
    icon: <IconTruck size={30} />,
    iconStyle: { backgroundColor: 'rgba(160, 82, 45, 0.25)', color: '#e8a27a' }
  }
];

export default function EventKindChooser({
  onChoose,
  current
}: {
  onChoose: (kind: EventKind) => void;
  current?: EventKind; // al "Cambiar" mientras se crea: el tipo que tiene ahora
}) {
  return (
    <Stack align='center' gap='lg' py='xl' px='md'>
      <Stack gap={4} align='center'>
        <Title order={2} ta='center'>¿Qué querés crear?</Title>
        <Text c='dimmed' ta='center' size='sm'>Una vez creado, el tipo no se puede cambiar.</Text>
      </Stack>
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing='lg' w='100%' maw={720}>
        {OPTIONS.map((o) => (
          <UnstyledButton key={o.kind} onClick={() => onChoose(o.kind)} aria-label={`Crear ${o.title}`}>
            <Paper
              withBorder
              radius='md'
              p='xl'
              h='100%'
              style={{
                borderColor: current === o.kind ? 'var(--mantine-color-blue-6)' : undefined,
                transition: 'border-color 150ms, transform 150ms'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--mantine-color-blue-5)')}
              onMouseLeave={(e) =>
                (e.currentTarget.style.borderColor = current === o.kind ? 'var(--mantine-color-blue-6)' : '')
              }
            >
              <Stack align='center' gap='sm'>
                <ThemeIcon size={60} radius='xl' style={o.iconStyle}>
                  {o.icon}
                </ThemeIcon>
                <Text fw={700} size='xl'>{o.title}</Text>
                <Text c='dimmed' ta='center' size='sm'>{o.description}</Text>
                {current === o.kind && <Badge variant='light'>Actual</Badge>}
              </Stack>
            </Paper>
          </UnstyledButton>
        ))}
      </SimpleGrid>
    </Stack>
  );
}

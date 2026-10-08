// src/components/StaffLedger/FixedList.tsx
// Fijos mensuales del empleado (vista admin). Cada mes aparece en la tabla como
// una línea más; acá se gestiona la definición.
'use client';
import { Paper, Group, Stack, Text, Menu, ActionIcon, Badge } from '@mantine/core';
import { IconDots, IconPencil, IconTrendingUp, IconCalendarOff, IconTrash } from '@tabler/icons-react';
import { formatPrice } from '@/utils/priceUtils';
import { FixedDef, arDay } from '@/utils/staffLedger';
import type { FixedModalMode } from './FixedModal';

const monthLabel = (ym: string) => `${ym.slice(5, 7)}/${ym.slice(0, 4)}`;

export default function FixedList({
  fixed,
  onAction,
  onDelete
}: {
  fixed: FixedDef[];
  onAction: (mode: Exclude<FixedModalMode, 'create'>, fixed: FixedDef) => void;
  onDelete: (fixed: FixedDef) => void;
}) {
  if (!fixed.length) return null;
  const thisMonth = (arDay(new Date()) as string).slice(0, 7);

  return (
    <Paper withBorder p='sm' radius='md'>
      <Text fw={600} size='sm' mb='xs'>Fijos mensuales</Text>
      <Stack gap={6}>
        {fixed.map((f) => {
          const ended = !!f.toMonth && f.toMonth < thisMonth;
          return (
            <Group key={f.entryId} justify='space-between' wrap='nowrap' opacity={ended ? 0.55 : 1}>
              <div>
                <Group gap={6}>
                  <Text size='sm' fw={500}>{f.description}</Text>
                  {f.rol && <Text size='xs' c='dimmed'>· {f.rol}</Text>}
                  {ended && <Badge size='xs' color='gray' variant='light'>Terminado</Badge>}
                </Group>
                <Text size='xs' c='dimmed'>
                  {formatPrice(f.amount)} por mes · día {f.dayOfMonth} · desde {monthLabel(f.fromMonth)}
                  {f.toMonth ? ` hasta ${monthLabel(f.toMonth)}` : ''}
                </Text>
              </div>
              <Menu position='bottom-end' withinPortal>
                <Menu.Target>
                  <ActionIcon variant='subtle' aria-label='Opciones del fijo'>
                    <IconDots size={16} />
                  </ActionIcon>
                </Menu.Target>
                <Menu.Dropdown>
                  <Menu.Item leftSection={<IconTrendingUp size={14} />} onClick={() => onAction('change', f)} disabled={ended}>
                    Cambiar monto desde un mes
                  </Menu.Item>
                  <Menu.Item leftSection={<IconCalendarOff size={14} />} onClick={() => onAction('end', f)} disabled={ended}>
                    Dar de baja
                  </Menu.Item>
                  <Menu.Item leftSection={<IconPencil size={14} />} onClick={() => onAction('edit', f)}>
                    Corregir (todos los meses)
                  </Menu.Item>
                  <Menu.Divider />
                  <Menu.Item color='red' leftSection={<IconTrash size={14} />} onClick={() => onDelete(f)}>
                    Borrar
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
            </Group>
          );
        })}
      </Stack>
    </Paper>
  );
}

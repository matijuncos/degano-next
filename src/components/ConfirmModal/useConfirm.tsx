// src/components/ConfirmModal/useConfirm.tsx
// Confirmación con un modal de Mantine en vez del confirm() del navegador.
// Uso:
//   const [confirm, confirmModal] = useConfirm();
//   if (!(await confirm({ title: '¿Borrar?', message: '...' }))) return;
//   ...y renderizar {confirmModal} en el componente.
'use client';
import { ReactNode, useCallback, useRef, useState } from 'react';
import { Modal, Text, Group, Button } from '@mantine/core';

type ConfirmOptions = {
  title: string;
  message?: ReactNode;
  confirmLabel?: string;
  color?: string;
};

export function useConfirm(): [(opts: ConfirmOptions) => Promise<boolean>, ReactNode] {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((ok: boolean) => void) | null>(null);

  const confirm = useCallback((next: ConfirmOptions) => {
    // Si había otra confirmación abierta, se toma como cancelada
    resolver.current?.(false);
    setOpts(next);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const close = (ok: boolean) => {
    resolver.current?.(ok);
    resolver.current = null;
    setOpts(null);
  };

  const modal = (
    <Modal opened={!!opts} onClose={() => close(false)} title={opts?.title} centered size='sm'>
      {opts?.message && <Text size='sm'>{opts.message}</Text>}
      <Group justify='flex-end' mt='md'>
        <Button variant='default' onClick={() => close(false)}>Cancelar</Button>
        <Button color={opts?.color ?? 'red'} onClick={() => close(true)} data-autofocus>
          {opts?.confirmLabel ?? 'Confirmar'}
        </Button>
      </Group>
    </Modal>
  );

  return [confirm, modal];
}

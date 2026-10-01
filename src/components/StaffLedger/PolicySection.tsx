// src/components/StaffLedger/PolicySection.tsx
'use client';
import { useRef, useState } from 'react';
import { Group, Button, Text, Paper } from '@mantine/core';
import { IconFileTypePdf } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';

// Póliza de seguro. El admin la sube/reemplaza/quita; el empleado solo la ve.
export default function PolicySection({
  employeeId,
  policy,
  canManage,
  onChange
}: {
  employeeId: string;
  policy: { fileName: string } | null;
  canManage: boolean;
  onChange?: (policy: { fileName: string } | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<'view' | 'upload' | 'delete' | null>(null);

  const fail = (message: string) => notifications.show({ color: 'red', message });

  const view = async () => {
    // Se abre la pestaña antes del await para que el browser no la bloquee
    const win = window.open('', '_blank');
    setBusy('view');
    try {
      const res = await fetch(`/api/staffPolicy?employeeId=${employeeId}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'No se pudo abrir la póliza');
      if (win) win.location.href = data.signedUrl;
      else window.location.href = data.signedUrl;
    } catch (e: any) {
      win?.close();
      fail(e.message);
    } finally {
      setBusy(null);
    }
  };

  const upload = async (file: File) => {
    if (file.type !== 'application/pdf') return fail('La póliza tiene que ser un PDF');
    setBusy('upload');
    try {
      const signRes = await fetch('/api/uploadToS3', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name, fileType: file.type, bucket: 'budgets', folder: 'staff-policies' })
      });
      const sign = await signRes.json().catch(() => ({}));
      if (!signRes.ok) throw new Error(sign?.error || 'No se pudo preparar la subida');

      const put = await fetch(sign.signedUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file });
      if (!put.ok) throw new Error('No se pudo subir el archivo');

      const res = await fetch('/api/staffPolicy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId, url: sign.url, fileName: file.name })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'No se pudo guardar la póliza');
      onChange?.({ fileName: data.insurancePolicy.fileName });
      notifications.show({ color: 'teal', message: 'Póliza cargada' });
    } catch (e: any) {
      fail(e.message);
    } finally {
      setBusy(null);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const remove = async () => {
    if (!confirm('¿Quitar la póliza de este empleado?')) return;
    setBusy('delete');
    try {
      const res = await fetch(`/api/staffPolicy?employeeId=${employeeId}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'No se pudo quitar la póliza');
      onChange?.(null);
    } catch (e: any) {
      fail(e.message);
    } finally {
      setBusy(null);
    }
  };

  if (!policy && !canManage) return null;

  return (
    <Paper withBorder p='sm' radius='md'>
      <Group justify='space-between' wrap='wrap'>
        <Group gap='xs'>
          <IconFileTypePdf size={20} />
          <Text size='sm' fw={500}>Póliza de seguro</Text>
          <Text size='sm' c='dimmed'>{policy ? policy.fileName : 'Sin cargar'}</Text>
        </Group>
        <Group gap='xs'>
          {policy && <Button size='xs' variant='light' onClick={view} loading={busy === 'view'}>Ver póliza</Button>}
          {canManage && (
            <>
              <input ref={inputRef} type='file' accept='application/pdf' hidden onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
              <Button size='xs' variant='default' onClick={() => inputRef.current?.click()} loading={busy === 'upload'}>
                {policy ? 'Reemplazar' : 'Subir PDF'}
              </Button>
              {policy && <Button size='xs' variant='subtle' color='red' onClick={remove} loading={busy === 'delete'}>Quitar</Button>}
            </>
          )}
        </Group>
      </Group>
    </Paper>
  );
}

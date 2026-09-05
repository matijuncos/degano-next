'use client';
import { useEffect, useState } from 'react';
import useSWR from 'swr';
import {
  Modal,
  TextInput,
  Textarea,
  Select,
  Button,
  Group,
  Stack
} from '@mantine/core';
import useNotification from '@/hooks/useNotification';
import { Task, TaskStatus, TASK_STATUS_LABELS, TASK_STATUSES } from '@/types/boards';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface TaskModalProps {
  opened: boolean;
  onClose: () => void;
  boardId: string;
  task?: Task | null;
  initialStatus?: TaskStatus;
  onSaved: () => void;
}

export default function TaskModal({
  opened,
  onClose,
  boardId,
  task = null,
  initialStatus = 'pending',
  onSaved
}: TaskModalProps) {
  const notify = useNotification();
  const isEdit = !!task;

  const { data: employees = [] } = useSWR<any[]>(
    opened ? '/api/employees' : null,
    fetcher
  );

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatus>(initialStatus);
  const [assigneeId, setAssigneeId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [attempted, setAttempted] = useState(false);

  // Sincronizar el formulario al abrir / cambiar de tarea
  useEffect(() => {
    if (!opened) return;
    setTitle(task?.title || '');
    setDescription(task?.description || '');
    setStatus(task?.status || initialStatus);
    setAssigneeId(task?.assigneeId || null);
    setAttempted(false);
  }, [opened, task, initialStatus]);

  const employeeOptions = employees
    .filter((emp) => emp.fullName)
    .map((emp) => ({
      value: emp._id,
      label: `${emp.fullName}${emp.rol ? ` - ${emp.rol}` : ''}`
    }));

  const handleSubmit = async () => {
    if (!title.trim()) {
      setAttempted(true);
      return;
    }
    setSaving(true);
    notify({ loading: true });
    const assigneeName =
      employees.find((e) => e._id === assigneeId)?.fullName || null;
    try {
      const payload: any = {
        title: title.trim(),
        description,
        status,
        assigneeId,
        assigneeName
      };
      const res = await fetch('/api/tasks', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          isEdit ? { id: task!._id, ...payload } : { boardId, ...payload }
        )
      });
      if (!res.ok) throw new Error('Error al guardar');
      notify({ message: isEdit ? 'Tarea actualizada' : 'Tarea creada' });
      onSaved();
      onClose();
    } catch (error) {
      console.error(error);
      notify({ type: 'defaultError' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={isEdit ? 'Editar tarea' : 'Nueva tarea'}
      centered
    >
      <Stack gap='sm'>
        <TextInput
          label='Título'
          placeholder='¿Qué hay que hacer?'
          value={title}
          onChange={(e) => setTitle(e.currentTarget.value)}
          error={attempted && !title.trim() ? 'El título es obligatorio' : undefined}
          required
          data-autofocus
        />
        <Textarea
          label='Descripción'
          placeholder='Detalle (opcional)'
          value={description}
          onChange={(e) => setDescription(e.currentTarget.value)}
          autosize
          minRows={2}
          maxRows={6}
        />
        <Select
          label='Estado'
          data={TASK_STATUSES.map((s) => ({
            value: s,
            label: TASK_STATUS_LABELS[s]
          }))}
          value={status}
          onChange={(v) => v && setStatus(v as TaskStatus)}
          allowDeselect={false}
        />
        <Select
          label='Responsable'
          placeholder='Sin asignar'
          data={employeeOptions}
          value={assigneeId}
          onChange={setAssigneeId}
          searchable
          clearable
          nothingFoundMessage='Sin empleados'
        />
        <Group justify='flex-end' mt='sm'>
          <Button variant='light' color='gray' onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} loading={saving}>
            {isEdit ? 'Guardar' : 'Crear'}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

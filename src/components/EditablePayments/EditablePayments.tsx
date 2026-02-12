'use client';
import { useDeganoCtx } from '@/context/DeganoContext';
import useNotification from '@/hooks/useNotification';
import { Box, Button, Flex, Group, Input, Text, Divider, ActionIcon, FileButton } from '@mantine/core';
import { DateTimePicker } from '@mantine/dates';
import { IconCheck, IconTrash, IconPlus, IconUpload, IconFile, IconEye, IconX } from '@tabler/icons-react';
import React, { useState, useMemo, useEffect } from 'react';
import { formatPrice } from '@/utils/priceUtils';
import { usePermissions } from '@/hooks/usePermissions';
import ProtectedAction from '@/components/ProtectedAction/ProtectedAction';
import { BudgetAnnex } from '@/context/types';
import { IconPencil } from '@tabler/icons-react';

const EditablePayments = () => {
  const { selectedEvent, setSelectedEvent, setLoading, updateEventInList } = useDeganoCtx();
  const notify = useNotification();
  const { can, permissions, isAdmin } = usePermissions();

  const [isEditing, setIsEditing] = useState(false);
  const [editedTotalToPay, setEditedTotalToPay] = useState(
    selectedEvent?.payment.totalToPay || ''
  );
  // Estado para nuevos pagos (inputs temporales)
  const [newPayments, setNewPayments] = useState<any[]>([]);
  // Estado para edición de pagos existentes
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const [editedPaymentAmount, setEditedPaymentAmount] = useState('');
  const [editedPaymentDate, setEditedPaymentDate] = useState<Date | null>(null);

  // Estado para anexos
  const [annexes, setAnnexes] = useState<BudgetAnnex[]>(
    selectedEvent?.payment?.annexes || []
  );
  const [hasAnnexChanges, setHasAnnexChanges] = useState(false);

  // Estado para archivo de presupuesto
  const [budgetFileUrl, setBudgetFileUrl] = useState<string>(
    selectedEvent?.payment?.budgetFileUrl || ''
  );
  const [uploading, setUploading] = useState(false);

  // Sincronizar estado cuando cambia el evento seleccionado
  useEffect(() => {
    if (selectedEvent) {
      setAnnexes(selectedEvent.payment?.annexes || []);
      setBudgetFileUrl(selectedEvent.payment?.budgetFileUrl || '');
      setHasAnnexChanges(false);
    }
  }, [selectedEvent]);

  // Función para limpiar el formato y obtener solo números
  const parseFormattedNumber = (value: string): string => {
    return value.replace(/[^0-9]/g, '');
  };

  // Función para formatear número mientras se escribe
  const formatNumberInput = (value: string): string => {
    const numericValue = parseFormattedNumber(value);
    if (!numericValue) return '';
    return `$ ${new Intl.NumberFormat('es-AR').format(Number(numericValue))}`;
  };

  // Funciones para manejar anexos
  const addAnnex = () => {
    const newAnnexes = [
      ...annexes,
      {
        id: Math.random().toString(36).slice(2, 11),
        description: '',
        amount: ''
      }
    ];
    setAnnexes(newAnnexes);
    setHasAnnexChanges(true);
  };

  const updateAnnex = (id: string, field: 'description' | 'amount', value: string) => {
    const processedValue = field === 'amount' ? formatNumberInput(value) : value;
    const newAnnexes = annexes.map(a =>
      a.id === id ? { ...a, [field]: processedValue } : a
    );
    setAnnexes(newAnnexes);
    setHasAnnexChanges(true);
  };

  const removeAnnex = (id: string) => {
    const newAnnexes = annexes.filter(a => a.id !== id);
    setAnnexes(newAnnexes);
    setHasAnnexChanges(true);
  };

  const saveAnnexes = async () => {
    // Limpiar los montos formateados antes de guardar
    const cleanedAnnexes = annexes.map(a => ({
      ...a,
      amount: parseFormattedNumber(a.amount)
    }));

    const eventUpdated = {
      ...selectedEvent,
      payment: {
        ...selectedEvent!.payment,
        annexes: cleanedAnnexes
      }
    };
    await updateEvent(eventUpdated);
    setHasAnnexChanges(false);
  };

  // Funciones para manejar archivo de presupuesto
  const handleUploadBudgetFile = async (file: File | null) => {
    if (!file) return;
    setUploading(true);
    try {
      const res = await fetch('/api/uploadToS3', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type,
          bucket: 'budgets'
        })
      });
      const { signedUrl, url } = await res.json();

      await fetch(signedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file
      });

      setBudgetFileUrl(url);

      // Guardar en el evento
      const eventUpdated = {
        ...selectedEvent,
        payment: {
          ...selectedEvent!.payment,
          budgetFileUrl: url
        }
      };
      await updateEvent(eventUpdated);
    } catch (error) {
      console.error('Error uploading file:', error);
      notify({ type: 'defaultError', message: 'Error al subir el archivo' });
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteBudgetFile = async () => {
    if (!budgetFileUrl) return;
    try {
      await fetch('/api/deleteFromS3', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: budgetFileUrl,
          bucket: 'budgets'
        })
      });

      setBudgetFileUrl('');

      // Actualizar el evento
      const eventUpdated = {
        ...selectedEvent,
        payment: {
          ...selectedEvent!.payment,
          budgetFileUrl: ''
        }
      };
      await updateEvent(eventUpdated);
    } catch (error) {
      console.error('Error deleting file:', error);
      notify({ type: 'defaultError', message: 'Error al eliminar el archivo' });
    }
  };

  const getCleanFileName = (url: string) => {
    const parts = url.split('/');
    const fileName = parts[parts.length - 1];
    // Remover el prefijo nanoid (primeros 21 caracteres + guión)
    return fileName.length > 22 ? fileName.slice(22) : fileName;
  };

  // Calcular el costo total de renta del equipamiento
  const rentalCost = useMemo(() => {
    return selectedEvent?.equipment.reduce(
      (total, equipment) => total + (equipment.rentalPrice || 0),
      0
    ) || 0;
  }, [selectedEvent?.equipment]);
  const updateEvent = async (event: any) => {
    setLoading(true);
    notify({ loading: true });

    const timeStamp = new Date().toISOString();
    try {
      const response = await fetch(`/api/updateEvent?id=${timeStamp}`, {
        method: 'PUT',
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(event)
      });
      const data = await response.json();
      notify();
      setSelectedEvent(data.event);
      updateEventInList(data.event);
    } catch (error) {
      notify({ type: 'defaultError' });
      console.log(error);
    } finally {
      setLoading(false);
    }
  };
  const handleEdit = () => {
    if (isEditing) {
      const numericValue = parseFormattedNumber(editedTotalToPay.toString());
      const eventUpdated = {
        ...selectedEvent,
        payment: { ...selectedEvent!.payment, totalToPay: numericValue }
      };
      updateEvent(eventUpdated);
    } else {
      // Al empezar a editar, formatear el valor actual
      const currentValue = selectedEvent?.payment.totalToPay || '';
      setEditedTotalToPay(formatNumberInput(currentValue.toString()));
    }
    setIsEditing(!isEditing);
  };

  const handleTotalToPayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formattedValue = formatNumberInput(e.target.value);
    setEditedTotalToPay(formattedValue);
  };

  // Funciones para NUEVOS pagos
  const addPayment = () => {
    setNewPayments([
      ...newPayments,
      {
        id: Math.random().toString(36).slice(2, 11),
        amount: '',
        date: new Date()
      }
    ]);
  };

  const updateNewPayment = (id: string, field: 'amount' | 'date', value: any) => {
    let processedValue = value;
    if (field === 'amount') {
      processedValue = formatNumberInput(value);
    }
    const updatedPayments = newPayments.map((payment) =>
      payment.id === id ? { ...payment, [field]: processedValue } : payment
    );
    setNewPayments(updatedPayments);
  };

  const removeNewPayment = (id: string) => {
    setNewPayments(newPayments.filter((p) => p.id !== id));
  };

  const saveNewPayment = async (paymentId: string) => {
    const paymentToSave = newPayments.find(p => p.id === paymentId);
    if (!paymentToSave) return;

    const cleanedPayment = {
      ...paymentToSave,
      amount: parseFormattedNumber(paymentToSave.amount || '')
    };

    const eventUpdated = {
      ...selectedEvent,
      payment: {
        ...selectedEvent!.payment,
        subsequentPayments: [
          ...(selectedEvent!.payment.subsequentPayments || []),
          cleanedPayment
        ]
      }
    };

    // Remover el pago del estado local de nuevos pagos
    setNewPayments(newPayments.filter(p => p.id !== paymentId));
    await updateEvent(eventUpdated);
  };

  // Funciones para EDITAR pagos existentes
  const startEditingPayment = (payment: any) => {
    setEditingPaymentId(payment.id);
    setEditedPaymentAmount(formatNumberInput(payment.amount?.toString() || ''));
    setEditedPaymentDate(new Date(payment.date));
  };

  const cancelEditingPayment = () => {
    setEditingPaymentId(null);
    setEditedPaymentAmount('');
    setEditedPaymentDate(null);
  };

  const saveEditedPayment = async () => {
    if (!editingPaymentId) return;

    const updatedSubsequentPayments = selectedEvent!.payment.subsequentPayments?.map((p: any) =>
      p.id === editingPaymentId
        ? { ...p, amount: parseFormattedNumber(editedPaymentAmount), date: editedPaymentDate }
        : p
    );

    const eventUpdated = {
      ...selectedEvent,
      payment: {
        ...selectedEvent!.payment,
        subsequentPayments: updatedSubsequentPayments
      }
    };

    setEditingPaymentId(null);
    setEditedPaymentAmount('');
    setEditedPaymentDate(null);
    await updateEvent(eventUpdated);
  };

  const deleteExistingPayment = async (paymentId: string) => {
    const updatedSubsequentPayments = selectedEvent!.payment.subsequentPayments?.filter(
      (p: any) => p.id !== paymentId
    );

    const eventUpdated = {
      ...selectedEvent,
      payment: {
        ...selectedEvent!.payment,
        subsequentPayments: updatedSubsequentPayments
      }
    };

    await updateEvent(eventUpdated);
  };
  const sumOfPartialPayments =
    selectedEvent?.payment.subsequentPayments?.reduce(
      (sum, payment) => sum + Number(payment.amount),
      0
    ) || 0;
  const initialPayment = Number(selectedEvent?.payment.upfrontAmount);
  const sumOfPayments = sumOfPartialPayments + initialPayment;
  const remainingPayment =
    Number(selectedEvent?.payment.totalToPay) - sumOfPayments;

  if (!selectedEvent) return null;

  return (
    <>
      {/* Costo de Renta del Equipamiento */}
      <Box
        mb='16px'
        pt='md'
        p='12px'
        style={{
          borderRadius: '8px',
          border: '1px solid rgba(255, 255, 255, 0.3)',
          backgroundColor: 'rgba(255, 255, 255, 0.05)'
        }}
      >
        <Text fw={600} size='sm' mb='4px' c='dimmed'>
          Costo de Renta (Equipamiento)
        </Text>
        <Text fw={700} size='lg'>
          {formatPrice(rentalCost)}
        </Text>
      </Box>

      <Box mb='24px'>
        <Flex justify='space-between'>
          <Flex
            gap='16px'
            p='10px'
            style={{
              borderRadius: '6px',
              border: 'solid 1px white'
            }}
          >
            <Text fw={600}>Cotizaciòn total del evento</Text>
            {isEditing ? (
              <Input
                type='text'
                value={editedTotalToPay}
                onChange={handleTotalToPayChange}
                placeholder='$ 0'
              />
            ) : (
              <Text>
                {formatPrice(Number(selectedEvent?.payment.totalToPay))}
              </Text>
            )}
          </Flex>
          <ProtectedAction requiredPermission='canViewPayments'>
            <Button onClick={handleEdit}>
              {isEditing ? 'Guardar' : 'Editar'}
            </Button>
          </ProtectedAction>
        </Flex>
      </Box>
      <Box
        mb='16px'
        p='10px'
        style={{
          borderRadius: '6px',
          border: 'solid 1px white'
        }}
      >
        <Text fw={600} mb='8px'>
          Pagos parciales:
        </Text>
        <hr />
        <Box my='24px'>
          {/* Pago Inicial */}
          <Flex gap='8px' align='center'>
            <Text fw={600}>Pago Inicial: </Text>
            <Text>
              {new Date(
                selectedEvent.payment.partialPaymentDate
              ).toLocaleDateString('es-AR')}{' '}
              -
            </Text>
            <Text>
              {formatPrice(Number(selectedEvent.payment.upfrontAmount))}
            </Text>
          </Flex>

          {/* Pagos parciales existentes */}
          {selectedEvent.payment.subsequentPayments?.map((payment: any) => (
            <Box key={payment.id} my='sm'>
              {editingPaymentId === payment.id ? (
                // Modo edición
                <Group gap='sm'>
                  <Input
                    type='text'
                    placeholder='$ 0'
                    value={editedPaymentAmount}
                    onChange={(e) => setEditedPaymentAmount(formatNumberInput(e.target.value))}
                    style={{ width: '150px' }}
                  />
                  <DateTimePicker
                    placeholder='Fecha de pago'
                    value={editedPaymentDate}
                    onChange={(date) => setEditedPaymentDate(date as Date | null)}
                    style={{ width: '180px' }}
                  />
                  <ActionIcon color='green' variant='light' onClick={saveEditedPayment}>
                    <IconCheck size={16} />
                  </ActionIcon>
                  <ActionIcon color='gray' variant='light' onClick={cancelEditingPayment}>
                    <IconX size={16} />
                  </ActionIcon>
                </Group>
              ) : (
                // Modo visualización
                <Flex gap='8px' align='center'>
                  <Text fw={600}>Pago parcial:</Text>
                  <Text>{new Date(payment.date).toLocaleDateString('es-AR')}</Text>
                  <Text> - {formatPrice(Number(payment.amount))}</Text>
                  {can('canEditPayments') && (
                    <ActionIcon
                      color='blue'
                      variant='subtle'
                      size='sm'
                      onClick={() => startEditingPayment(payment)}
                    >
                      <IconPencil size={14} />
                    </ActionIcon>
                  )}
                  {can('canDeletePayments') && (
                    <ActionIcon
                      color='red'
                      variant='subtle'
                      size='sm'
                      onClick={() => deleteExistingPayment(payment.id)}
                    >
                      <IconTrash size={14} />
                    </ActionIcon>
                  )}
                </Flex>
              )}
            </Box>
          ))}

          {/* Nuevos pagos (inputs temporales) */}
          {newPayments.map((payment) => (
            <Box key={payment.id} my='sm'>
              <Text fw={600} size='sm' mb='4px'>
                Nuevo pago
              </Text>
              <Group gap='sm'>
                <Input
                  type='text'
                  placeholder='$ 0'
                  value={payment.amount}
                  onChange={(e) =>
                    updateNewPayment(payment.id, 'amount', e.target.value)
                  }
                  style={{ width: '150px' }}
                  disabled={!can('canEditPayments')}
                />
                <DateTimePicker
                  placeholder='Fecha de pago'
                  value={new Date(payment.date)}
                  onChange={(date) => updateNewPayment(payment.id, 'date', date)}
                  style={{ width: '180px' }}
                  disabled={!can('canEditPayments')}
                />
                {can('canDeletePayments') && (
                  <ActionIcon
                    color='red'
                    variant='light'
                    onClick={() => removeNewPayment(payment.id)}
                  >
                    <IconTrash size={16} />
                  </ActionIcon>
                )}
                {can('canCreatePayments') && (
                  <ActionIcon
                    color='green'
                    variant='light'
                    onClick={() => saveNewPayment(payment.id)}
                  >
                    <IconCheck size={16} />
                  </ActionIcon>
                )}
              </Group>
            </Box>
          ))}

          {/* Botón agregar pago */}
          {!newPayments.length && (
            <Box mt='md'>
              <ProtectedAction requiredPermission='canViewPayments'>
                <Button variant='light' leftSection={<IconPlus size={16} />} onClick={addPayment}>
                  Agregar pago
                </Button>
              </ProtectedAction>
            </Box>
          )}
        </Box>
      </Box>

      <Box
        p='10px'
        my='24px'
        style={{
          borderRadius: '6px',
          border: 'solid 1px white'
        }}
      >
        <Text fw={600} mb='8px'>
          Suma de pagos parciales: {formatPrice(sumOfPayments)}
        </Text>
        <hr />
        <Text fw={600} my='8px'>
          Falta pagar: {formatPrice(remainingPayment)}
        </Text>
      </Box>

      {/* SECCIÓN DE ANEXOS */}
      <Divider my="md" />
      <Text fw={600} mb="sm">Anexos</Text>

      {/* Anexos existentes guardados en el evento */}
      {selectedEvent?.payment?.annexes && selectedEvent.payment.annexes.length > 0 && !hasAnnexChanges && (
        <Box mb="md">
          {selectedEvent.payment.annexes.map((annex: BudgetAnnex, idx: number) => (
            <Flex key={annex.id || idx} gap="sm" mb="xs" align="center">
              <Text size="sm" style={{ flex: 1 }}>
                {annex.description}: {formatPrice(Number(annex.amount))}
              </Text>
              {can('canEditPayments') && (
                <ActionIcon
                  color="red"
                  variant="light"
                  onClick={() => {
                    // Cargar anexos existentes para edición y eliminar este
                    const existingAnnexes = selectedEvent.payment.annexes?.map(a => ({
                      ...a,
                      amount: formatNumberInput(a.amount.toString())
                    })) || [];
                    const filteredAnnexes = existingAnnexes.filter(a => a.id !== annex.id);
                    setAnnexes(filteredAnnexes);
                    setHasAnnexChanges(true);
                  }}
                >
                  <IconTrash size={16} />
                </ActionIcon>
              )}
            </Flex>
          ))}
        </Box>
      )}

      {/* Anexos en edición */}
      {hasAnnexChanges && annexes.map((annex) => (
        <Group key={annex.id} gap="sm" mb="sm" align="center">
          <Input
            placeholder="Descripción del anexo"
            value={annex.description}
            onChange={(e) => updateAnnex(annex.id, 'description', e.target.value)}
            style={{ flex: 1 }}
            disabled={!can('canEditPayments')}
          />
          <Input
            placeholder="Monto ($)"
            value={annex.amount}
            onChange={(e) => updateAnnex(annex.id, 'amount', e.target.value)}
            style={{ width: '150px' }}
            disabled={!can('canEditPayments')}
          />
          <ActionIcon color="red" variant="light" onClick={() => removeAnnex(annex.id)}>
            <IconTrash size={16} />
          </ActionIcon>
        </Group>
      ))}

      <Group gap="sm">
        {can('canEditPayments') && (
          <Button variant="light" leftSection={<IconPlus size={16} />} onClick={() => {
            if (!hasAnnexChanges && selectedEvent?.payment?.annexes) {
              // Cargar anexos existentes formateados para edición
              const existingAnnexes = selectedEvent.payment.annexes.map(a => ({
                ...a,
                amount: formatNumberInput(a.amount.toString())
              }));
              setAnnexes(existingAnnexes);
              setHasAnnexChanges(true);
            }
            addAnnex();
          }}>
            Agregar anexo
          </Button>
        )}
        {hasAnnexChanges && (
          <Button variant="filled" color="green" leftSection={<IconCheck size={16} />} onClick={saveAnnexes}>
            Guardar anexos
          </Button>
        )}
      </Group>

      {/* SECCIÓN DE ARCHIVO DE PRESUPUESTO (solo admin) */}
      {isAdmin && (
        <>
          <Divider my="md" />
          <Text fw={600} mb="sm">Archivo de presupuesto</Text>

          {budgetFileUrl ? (
            <Group>
              <IconFile size={20} />
              <Text size="sm" style={{ flex: 1 }}>
                {getCleanFileName(budgetFileUrl)}
              </Text>
              <ActionIcon
                color="blue"
                variant="light"
                onClick={() => window.open(budgetFileUrl, '_blank')}
              >
                <IconEye size={16} />
              </ActionIcon>
              <ActionIcon color="red" variant="light" onClick={handleDeleteBudgetFile}>
                <IconTrash size={16} />
              </ActionIcon>
            </Group>
          ) : (
            <FileButton onChange={handleUploadBudgetFile} accept="image/*,.pdf">
              {(props) => (
                <Button
                  {...props}
                  variant="light"
                  leftSection={<IconUpload size={16} />}
                  loading={uploading}
                >
                  Subir archivo
                </Button>
              )}
            </FileButton>
          )}
        </>
      )}
    </>
  );
};

export default EditablePayments;

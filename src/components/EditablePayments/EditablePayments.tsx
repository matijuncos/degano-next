'use client';
import { useDeganoCtx } from '@/context/DeganoContext';
import useNotification from '@/hooks/useNotification';
import { Box, Button, Flex, Group, Input, Text, Divider, ActionIcon, FileButton } from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { IconCheck, IconTrash, IconPlus, IconUpload, IconFile, IconEye, IconX } from '@tabler/icons-react';
import React, { useState, useMemo, useEffect } from 'react';
import { formatPrice } from '@/utils/priceUtils';
import { usePermissions } from '@/hooks/usePermissions';
import ProtectedAction from '@/components/ProtectedAction/ProtectedAction';
import { BudgetAnnex, BudgetFile } from '@/context/types';
import { IconPencil } from '@tabler/icons-react';

const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const MAX_BUDGET_FILES = 10;

const getCleanFileName = (url: string) => {
  const parts = url.split('/');
  const fileName = parts[parts.length - 1];
  return fileName.length > 22 ? decodeURIComponent(fileName.slice(22)) : decodeURIComponent(fileName);
};

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
  const [editedPaymentDescription, setEditedPaymentDescription] = useState('');
  // Estado para editar el Adelanto (pago inicial / upfrontAmount)
  const [editingUpfront, setEditingUpfront] = useState(false);
  const [editedUpfrontAmount, setEditedUpfrontAmount] = useState('');
  const [editedUpfrontDate, setEditedUpfrontDate] = useState<Date | null>(null);

  // Estado para anexos
  const [annexes, setAnnexes] = useState<BudgetAnnex[]>(
    selectedEvent?.payment?.annexes || []
  );
  const [hasAnnexChanges, setHasAnnexChanges] = useState(false);

  // Estado para archivos de presupuesto (con compat layer para eventos viejos)
  const [budgetFiles, setBudgetFiles] = useState<BudgetFile[]>(
    selectedEvent?.payment?.budgetFiles || (selectedEvent?.payment?.budgetFileUrl
      ? [{ id: 'legacy', url: selectedEvent.payment.budgetFileUrl, fileName: getCleanFileName(selectedEvent.payment.budgetFileUrl), uploadedAt: '' }]
      : [])
  );
  const [uploading, setUploading] = useState(false);

  // Sincronizar estado cuando cambia el evento seleccionado
  useEffect(() => {
    if (selectedEvent) {
      setAnnexes(selectedEvent.payment?.annexes || []);
      setBudgetFiles(selectedEvent.payment?.budgetFiles || (selectedEvent.payment?.budgetFileUrl
        ? [{ id: 'legacy', url: selectedEvent.payment.budgetFileUrl, fileName: getCleanFileName(selectedEvent.payment.budgetFileUrl), uploadedAt: '' }]
        : []));
      setHasAnnexChanges(false);
    }
  }, [selectedEvent]);

  // Función para limpiar el formato y obtener solo números
  const parseFormattedNumber = (value: string): string => {
    const digits = value.replace(/[^0-9]/g, '');
    if (!digits) return '';
    return digits;
  };

  // Función para formatear número mientras se escribe
  const formatNumberInput = (value: string): string => {
    const digits = value.replace(/[^0-9]/g, '');
    if (!digits) return '';
    const formatted = new Intl.NumberFormat('es-AR').format(Number(digits));
    return `$ ${formatted}`;
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

  // Funciones para manejar archivos de presupuesto
  const handleUploadBudgetFiles = async (files: File[]) => {
    if (!files.length) return;

    if (budgetFiles.length + files.length > MAX_BUDGET_FILES) {
      notify({ type: 'defaultError', message: `Máximo ${MAX_BUDGET_FILES} archivos permitidos.` });
      return;
    }

    const oversizedFile = files.find(f => f.size > MAX_FILE_SIZE_BYTES);
    if (oversizedFile) {
      notify({ type: 'defaultError', message: `"${oversizedFile.name}" supera el límite de ${MAX_FILE_SIZE_MB} MB.` });
      return;
    }

    setUploading(true);
    try {
      const uploadedFiles: BudgetFile[] = [];

      for (const file of files) {
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

        uploadedFiles.push({
          id: Math.random().toString(36).slice(2, 11),
          url,
          fileName: file.name,
          uploadedAt: new Date().toISOString()
        });
      }

      const newBudgetFiles = [...budgetFiles, ...uploadedFiles];
      setBudgetFiles(newBudgetFiles);

      const eventUpdated = {
        ...selectedEvent,
        payment: {
          ...selectedEvent!.payment,
          budgetFiles: newBudgetFiles
        }
      };
      await updateEvent(eventUpdated);
    } catch (error) {
      console.error('Error uploading files:', error);
      notify({ type: 'defaultError', message: 'Error al subir archivo(s)' });
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteBudgetFile = async (fileToDelete: BudgetFile) => {
    try {
      await fetch('/api/deleteFromS3', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: fileToDelete.url,
          bucket: 'budgets'
        })
      });

      const newBudgetFiles = budgetFiles.filter(f => f.id !== fileToDelete.id);
      setBudgetFiles(newBudgetFiles);

      const eventUpdated = {
        ...selectedEvent,
        payment: {
          ...selectedEvent!.payment,
          budgetFiles: newBudgetFiles
        }
      };
      await updateEvent(eventUpdated);
    } catch (error) {
      console.error('Error deleting file:', error);
      notify({ type: 'defaultError', message: 'Error al eliminar el archivo' });
    }
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
      if (!response.ok) throw new Error(data.error || 'Error al actualizar');
      const updatedEvent = data.event || event;
      notify();
      setSelectedEvent(updatedEvent);
      updateEventInList(updatedEvent);
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
        date: new Date(),
        description: ''
      }
    ]);
  };

  const updateNewPayment = (id: string, field: 'amount' | 'date' | 'description', value: any) => {
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
    setEditedPaymentDescription(payment.description || '');
  };

  const cancelEditingPayment = () => {
    setEditingPaymentId(null);
    setEditedPaymentAmount('');
    setEditedPaymentDate(null);
    setEditedPaymentDescription('');
  };

  const saveEditedPayment = async () => {
    if (!editingPaymentId) return;

    const updatedSubsequentPayments = selectedEvent!.payment.subsequentPayments?.map((p: any) =>
      p.id === editingPaymentId
        ? {
            ...p,
            amount: parseFormattedNumber(editedPaymentAmount),
            date: editedPaymentDate,
            description: editedPaymentDescription.trim()
          }
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
    setEditedPaymentDescription('');
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

  // ── Editar / eliminar el Adelanto (pago inicial) ──
  const startEditingUpfront = () => {
    setEditingUpfront(true);
    setEditedUpfrontAmount(
      formatNumberInput(selectedEvent?.payment.upfrontAmount?.toString() || '')
    );
    setEditedUpfrontDate(
      selectedEvent?.payment.partialPaymentDate
        ? new Date(selectedEvent.payment.partialPaymentDate)
        : null
    );
  };

  const cancelEditingUpfront = () => {
    setEditingUpfront(false);
    setEditedUpfrontAmount('');
    setEditedUpfrontDate(null);
  };

  const saveEditedUpfront = async () => {
    const eventUpdated = {
      ...selectedEvent,
      payment: {
        ...selectedEvent!.payment,
        upfrontAmount: parseFormattedNumber(editedUpfrontAmount),
        ...(editedUpfrontDate ? { partialPaymentDate: editedUpfrontDate } : {})
      }
    };
    setEditingUpfront(false);
    setEditedUpfrontAmount('');
    setEditedUpfrontDate(null);
    await updateEvent(eventUpdated);
  };

  const deleteUpfront = async () => {
    const eventUpdated = {
      ...selectedEvent,
      payment: {
        ...selectedEvent!.payment,
        upfrontAmount: ''
      }
    };
    await updateEvent(eventUpdated);
  };

  const baseBudget = Number(selectedEvent?.payment?.totalToPay) || 0;
  const annexesSum = selectedEvent?.payment?.annexes?.reduce(
    (sum: number, annex: any) => sum + Number(annex.amount), 0
  ) || 0;
  const totalBudget = baseBudget + annexesSum;

  // Collect all payments in order
  const allPayments: { amount: number; label: string; id?: string; date?: any; raw?: any }[] = [];
  if (selectedEvent?.payment?.upfrontAmount) {
    const date = selectedEvent.payment.partialPaymentDate
      ? new Date(selectedEvent.payment.partialPaymentDate).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })
      : '';
    allPayments.push({
      amount: Number(selectedEvent.payment.upfrontAmount),
      label: `Adelanto${date ? ` ${date}` : ''}`,
      id: '__upfront__'
    });
  }
  if (selectedEvent?.payment?.subsequentPayments) {
    selectedEvent.payment.subsequentPayments.forEach((p: any) => {
      const date = p.date
        ? new Date(p.date).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })
        : '';
      allPayments.push({
        amount: Number(p.amount),
        label: `${p.description || 'Pago'}${date ? ` ${date}` : ''}`,
        id: p.id,
        date: p.date,
        raw: p
      });
    });
  }

  const sumOfPayments = allPayments.reduce((sum, p) => sum + p.amount, 0);
  const remainingPayment = totalBudget - sumOfPayments;

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

      {/* PRESUPUESTO BASE + ANEXOS */}
      <Box
        mb='16px'
        p='10px'
        style={{
          borderRadius: '6px',
          border: 'solid 1px white'
        }}
      >
        <Text fw={600} mb='8px'>
          Presupuesto
        </Text>

        {/* Presupuesto inicial editable */}
        <Flex gap='8px' align='center' mb='xs'>
          {isEditing ? (
            <Input
              type='text'
              value={editedTotalToPay}
              onChange={handleTotalToPayChange}
              placeholder='$ 0'
              style={{ width: '180px' }}
              autoComplete='off'
            />
          ) : (
            <Text size='sm'>
              {formatPrice(baseBudget)} - Presupuesto inicial
            </Text>
          )}
          <ProtectedAction requiredPermission='canViewPayments'>
            <Button size='xs' variant='light' onClick={handleEdit}>
              {isEditing ? 'Guardar' : 'Editar'}
            </Button>
          </ProtectedAction>
        </Flex>

        {/* Anexos existentes guardados en el evento */}
        {selectedEvent?.payment?.annexes && selectedEvent.payment.annexes.length > 0 && !hasAnnexChanges && (
          <>
            {selectedEvent.payment.annexes.map((annex: BudgetAnnex, idx: number) => (
              <Flex key={annex.id || idx} gap='sm' mb='xs' align='center'>
                <Text size='sm' style={{ flex: 1 }}>
                  {formatPrice(Number(annex.amount))} - {annex.description}
                </Text>
                {can('canEditPayments') && (
                  <ActionIcon
                    color='red'
                    variant='light'
                    size='sm'
                    onClick={() => {
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
          </>
        )}

        {/* Anexos en edición */}
        {hasAnnexChanges && annexes.map((annex) => (
          <Group key={annex.id} gap='sm' mb='sm' align='center'>
            <Input
              placeholder='Descripción del anexo'
              value={annex.description}
              onChange={(e) => updateAnnex(annex.id, 'description', e.target.value)}
              style={{ flex: 1 }}
              disabled={!can('canEditPayments')}
              autoComplete='off'
            />
            <Input
              placeholder='Monto ($)'
              value={annex.amount}
              onChange={(e) => updateAnnex(annex.id, 'amount', e.target.value)}
              style={{ width: '150px' }}
              disabled={!can('canEditPayments')}
              autoComplete='off'
            />
            <ActionIcon color='red' variant='light' onClick={() => removeAnnex(annex.id)}>
              <IconTrash size={16} />
            </ActionIcon>
          </Group>
        ))}

        <Group gap='sm' mb='sm'>
          {can('canEditPayments') && (
            <Button variant='light' size='xs' leftSection={<IconPlus size={14} />} onClick={() => {
              if (!hasAnnexChanges && selectedEvent?.payment?.annexes) {
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
            <Button variant='filled' size='xs' color='green' leftSection={<IconCheck size={14} />} onClick={saveAnnexes}>
              Guardar anexos
            </Button>
          )}
        </Group>

        {/* Línea + Total (base + anexos) */}
        <Divider variant='dashed' size='sm' my='xs' style={{ borderColor: '#C9C9C9' }} />
        <Text size='sm' fw={600} mb='xs'>
          {formatPrice(totalBudget)}
        </Text>

        {/* Pagos como negativos con saldo progresivo */}
        {(() => {
          let runningBalance = totalBudget;
          return (
            <>
              {/* Pago Inicial */}
              {selectedEvent?.payment?.upfrontAmount && (
                <>
                  {editingUpfront ? (
                    <Group gap='sm' mb={4}>
                      <Input
                        type='text'
                        placeholder='$ 0'
                        value={editedUpfrontAmount}
                        onChange={(e) =>
                          setEditedUpfrontAmount(formatNumberInput(e.target.value))
                        }
                        style={{ width: '150px' }}
                        autoComplete='off'
                      />
                      <DatePickerInput
                        placeholder='Fecha'
                        value={editedUpfrontDate}
                        onChange={(val: any) =>
                          setEditedUpfrontDate(val ? new Date(val) : null)
                        }
                        valueFormat='DD/MM/YYYY'
                        style={{ width: '150px' }}
                      />
                      <ActionIcon color='green' variant='light' onClick={saveEditedUpfront}>
                        <IconCheck size={16} />
                      </ActionIcon>
                      <ActionIcon color='gray' variant='light' onClick={cancelEditingUpfront}>
                        <IconX size={16} />
                      </ActionIcon>
                    </Group>
                  ) : (
                    <Flex gap='8px' align='center' mb={4}>
                      <Text size='sm' c='red'>
                        -{formatPrice(Number(selectedEvent.payment.upfrontAmount))} - (Adelanto{selectedEvent.payment.partialPaymentDate ? ` ${new Date(selectedEvent.payment.partialPaymentDate).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })}` : ''})
                      </Text>
                      {can('canEditPayments') && (
                        <ActionIcon
                          color='blue'
                          variant='subtle'
                          size='sm'
                          onClick={startEditingUpfront}
                          title='Editar adelanto'
                        >
                          <IconPencil size={14} />
                        </ActionIcon>
                      )}
                      {can('canDeletePayments') && (
                        <ActionIcon
                          color='red'
                          variant='subtle'
                          size='sm'
                          onClick={deleteUpfront}
                          title='Eliminar adelanto'
                        >
                          <IconTrash size={14} />
                        </ActionIcon>
                      )}
                    </Flex>
                  )}
                  {(() => { runningBalance -= Number(selectedEvent.payment.upfrontAmount); return null; })()}
                  <Divider variant='dashed' size='sm' my='xs' style={{ borderColor: '#C9C9C9' }} />
                  <Text size='sm' fw={selectedEvent.payment.subsequentPayments?.length ? 400 : 600} mb={4}>
                    {formatPrice(runningBalance)}
                  </Text>
                </>
              )}

              {/* Pagos parciales existentes */}
              {selectedEvent.payment.subsequentPayments?.map((payment: any, idx: number) => {
                runningBalance -= Number(payment.amount);
                const isLast = idx === (selectedEvent.payment.subsequentPayments?.length || 0) - 1;
                return (
                  <Box key={payment.id} my='xs'>
                    {editingPaymentId === payment.id ? (
                      <Group gap='sm'>
                        <Input
                          type='text'
                          placeholder='Concepto (ej. 30% del evento)'
                          value={editedPaymentDescription}
                          onChange={(e) => setEditedPaymentDescription(e.target.value)}
                          style={{ flex: 1, minWidth: '160px' }}
                          autoComplete='off'
                        />
                        <Input
                          type='text'
                          placeholder='$ 0'
                          value={editedPaymentAmount}
                          onChange={(e) => setEditedPaymentAmount(formatNumberInput(e.target.value))}
                          style={{ width: '150px' }}
                          autoComplete='off'
                        />
                        <DatePickerInput
                          placeholder='Fecha de pago'
                          value={editedPaymentDate}
                          onChange={(val: any) => setEditedPaymentDate(val ? new Date(val) : null)}
                          valueFormat='DD/MM/YYYY'
                          style={{ width: '150px' }}
                        />
                        <ActionIcon color='green' variant='light' onClick={saveEditedPayment}>
                          <IconCheck size={16} />
                        </ActionIcon>
                        <ActionIcon color='gray' variant='light' onClick={cancelEditingPayment}>
                          <IconX size={16} />
                        </ActionIcon>
                      </Group>
                    ) : (
                      <Flex gap='8px' align='center'>
                        <Text size='sm' c='red'>
                          -{formatPrice(Number(payment.amount))} - ({payment.description || 'Pago'}{payment.date ? ` ${new Date(payment.date).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })}` : ''})
                        </Text>
                        {can('canEditPayments') && (
                          <ActionIcon color='blue' variant='subtle' size='sm' onClick={() => startEditingPayment(payment)}>
                            <IconPencil size={14} />
                          </ActionIcon>
                        )}
                        {can('canDeletePayments') && (
                          <ActionIcon color='red' variant='subtle' size='sm' onClick={() => deleteExistingPayment(payment.id)}>
                            <IconTrash size={14} />
                          </ActionIcon>
                        )}
                      </Flex>
                    )}
                    <Divider variant='dashed' size='sm' my='xs' style={{ borderColor: '#C9C9C9' }} />
                    <Text size='sm' fw={isLast ? 600 : 400} mb={4}>
                      {formatPrice(runningBalance)}
                    </Text>
                  </Box>
                );
              })}
            </>
          );
        })()}

        {/* Nuevos pagos (inputs temporales) */}
        {newPayments.map((payment) => (
          <Box key={payment.id} my='sm'>
            <Text fw={600} size='sm' mb='4px'>
              Nuevo pago
            </Text>
            <Group gap='sm'>
              <Input
                type='text'
                placeholder='Concepto (ej. 30% del evento)'
                value={payment.description || ''}
                onChange={(e) =>
                  updateNewPayment(payment.id, 'description', e.target.value)
                }
                style={{ flex: 1, minWidth: '160px' }}
                disabled={!can('canEditPayments')}
                autoComplete='off'
              />
              <Input
                type='text'
                placeholder='$ 0'
                value={payment.amount}
                onChange={(e) =>
                  updateNewPayment(payment.id, 'amount', e.target.value)
                }
                style={{ width: '150px' }}
                disabled={!can('canEditPayments')}
                autoComplete='off'
              />
              <DatePickerInput
                placeholder='Fecha de pago'
                value={payment.date ? new Date(payment.date) : null}
                onChange={(val: any) =>
                  updateNewPayment(payment.id, 'date', val ? new Date(val) : null)
                }
                valueFormat='DD/MM/YYYY'
                style={{ width: '150px' }}
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
              <Button variant='light' size='xs' leftSection={<IconPlus size={14} />} onClick={addPayment}>
                Agregar pago
              </Button>
            </ProtectedAction>
          </Box>
        )}
      </Box>

      {/* SECCIÓN DE ARCHIVOS DE PRESUPUESTO (solo admin) */}
      {isAdmin && (
        <>
          <Divider my='md' />
          <Text fw={600} mb='sm'>Archivos de presupuesto</Text>

          {budgetFiles.map((file) => (
            <Group key={file.id} mb='xs'>
              <IconFile size={20} />
              <Text size='sm' style={{ flex: 1 }}>
                {file.fileName}
              </Text>
              <ActionIcon
                color='blue'
                variant='light'
                onClick={() => window.open(file.url, '_blank')}
              >
                <IconEye size={16} />
              </ActionIcon>
              <ActionIcon color='red' variant='light' onClick={() => handleDeleteBudgetFile(file)}>
                <IconTrash size={16} />
              </ActionIcon>
            </Group>
          ))}

          {budgetFiles.length < MAX_BUDGET_FILES && (
            <FileButton onChange={handleUploadBudgetFiles} accept='image/*,.pdf' multiple>
              {(props) => (
                <Button
                  {...props}
                  variant='light'
                  leftSection={<IconUpload size={16} />}
                  loading={uploading}
                >
                  Subir archivo{budgetFiles.length > 0 ? 's' : ''}
                </Button>
              )}
            </FileButton>
          )}

          {budgetFiles.length > 0 && (
            <Text size='xs' c='dimmed' mt='xs'>
              {budgetFiles.length}/{MAX_BUDGET_FILES} archivos (máx. {MAX_FILE_SIZE_MB} MB c/u)
            </Text>
          )}
        </>
      )}
    </>
  );
};

export default EditablePayments;

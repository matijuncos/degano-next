'use client';
import { useDeganoCtx } from '@/context/DeganoContext';
import useNotification from '@/hooks/useNotification';
import { Box, Button, Flex, Group, Input, Text } from '@mantine/core';
import { DateTimePicker } from '@mantine/dates';
import { IconCheck, IconTrash } from '@tabler/icons-react';
import React, { useState, useMemo } from 'react';
import { formatPrice } from '@/utils/priceUtils';
import { usePermissions } from '@/hooks/usePermissions';
import ProtectedAction from '@/components/ProtectedAction/ProtectedAction';

const EditablePayments = () => {
  const { selectedEvent, setSelectedEvent, setLoading } = useDeganoCtx();
  const notify = useNotification();
  const { can, permissions } = usePermissions();

  const [isEditing, setIsEditing] = useState(false);
  const [editedTotalToPay, setEditedTotalToPay] = useState(
    selectedEvent?.payment.totalToPay || ''
  );
  const [subsequentPayments, setSubsequentPayments] = useState<any[]>(
    selectedEvent?.payment.subsequentPayments || []
  );

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

  const addPayment = () => {
    setSubsequentPayments([
      ...subsequentPayments,
      {
        id: Math.random().toString(36).slice(2, 11),
        amount: '',
        date: new Date()
      }
    ]);
  };

  const updatePayment = (id: string, field: 'amount' | 'date', value: any) => {
    let processedValue = value;

    // Si es el campo amount, formatear el valor
    if (field === 'amount') {
      processedValue = formatNumberInput(value);
    }

    const updatedPayments = subsequentPayments?.map((payment) =>
      payment.id === id ? { ...payment, [field]: processedValue } : payment
    );
    setSubsequentPayments(updatedPayments);
  };

  const removePayment = (index: number) => {
    setSubsequentPayments(subsequentPayments.filter((_, i) => i !== index));
  };

  const savePaymentData = () => {
    // Limpiar los montos formateados antes de guardar
    const cleanedPayments = subsequentPayments.map((payment) => ({
      ...payment,
      amount: parseFormattedNumber(payment.amount || '')
    }));

    const eventUpdated = {
      ...selectedEvent,
      payment: {
        ...selectedEvent!.payment,
        subsequentPayments: [
          ...(selectedEvent!.payment.subsequentPayments as any[]),
          ...cleanedPayments
        ]
      }
    };
    setSubsequentPayments([]);
    updateEvent(eventUpdated);
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
  console.log(selectedEvent.payment);
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
          <Flex gap='8px'>
            <Text fw={600}>Pago Inicial: </Text>
            <Text>
              {new Date(
                selectedEvent.payment.partialPaymentDate
              ).toLocaleDateString()}{' '}
              -
            </Text>
            <Text>
              {formatPrice(Number(selectedEvent.payment.upfrontAmount))}
            </Text>
          </Flex>
          {selectedEvent.payment.subsequentPayments?.map((payment) => (
            <Box key={payment.id}>
              <Flex gap='8px'>
                <Text fw={600}>Pago parcial:</Text>

                <Text>{new Date(payment.date).toLocaleDateString()}</Text>
                <Text> - {formatPrice(Number(payment.amount))}</Text>
              </Flex>
            </Box>
          ))}
        </Box>
      </Box>
      {subsequentPayments.map((payment) => (
        <Box key={payment.id} mb='12px'>
          <Text fw={600} size='md' mb='8px'>
            Nuevo pago
          </Text>
          <Group>
            <Input
              type='text'
              placeholder='$ 0'
              value={payment.amount}
              onChange={(e) =>
                updatePayment(payment.id, 'amount', e.target.value)
              }
              style={{ width: '180px' }}
              disabled={!can('canEditPayments')}
            />
            <DateTimePicker
              placeholder='Fecha de pago'
              value={new Date(payment.date)}
              onChange={(date) => updatePayment(payment.id, 'date', date)}
              style={{ width: '200px' }}
              disabled={!can('canEditPayments')}
            />
            {can('canDeletePayments') && (
              <Button
                onClick={() => removePayment(subsequentPayments.indexOf(payment))}
                variant='outline'
                color='red'
                size='sm'
              >
                <IconTrash size={16} />
              </Button>
            )}
            {can('canCreatePayments') && (
              <Button
                onClick={() => savePaymentData()}
                variant='outline'
                color='green'
                size='sm'
              >
                <IconCheck size={16} />
              </Button>
            )}
          </Group>
        </Box>
      ))}
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
      {!subsequentPayments.length && (
        <ProtectedAction requiredPermission='canViewPayments'>
          <Button onClick={addPayment}>Agregar pago</Button>
        </ProtectedAction>
      )}
    </>
  );
};

export default EditablePayments;

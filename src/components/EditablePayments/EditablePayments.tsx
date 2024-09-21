'use client';
import { useDeganoCtx } from '@/context/DeganoContext';
import useNotification from '@/hooks/useNotification';
import { Box, Button, Flex, Group, Input, Text } from '@mantine/core';
import { DateTimePicker } from '@mantine/dates';
import { IconCheck, IconTrash } from '@tabler/icons-react';
import React, { useState } from 'react';

const EditablePayments = () => {
  const { selectedEvent, setSelectedEvent, setLoading } = useDeganoCtx();
  const notify = useNotification();

  const [isEditing, setIsEditing] = useState(false);
  const [editedTotalToPay, setEditedTotalToPay] = useState(
    selectedEvent?.payment.totalToPay || ''
  );
  const [subsequentPayments, setSubsequentPayments] = useState<any[]>([]);
  const updateEvent = async (event: any) => {
    setLoading(true);
    notify('', '', '', true);

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
      notify('Operación errónea', 'Algo salio mal, vuelve a intentarlo', 'red');
      console.log(error);
    } finally {
      setLoading(false);
    }
  };
  const handleEdit = () => {
    if (isEditing) {
      const eventUpdated = {
        ...selectedEvent,
        payment: { ...selectedEvent!.payment, totalToPay: editedTotalToPay }
      };
      updateEvent(eventUpdated);
    }
    setIsEditing(!isEditing);
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
    const updatedPayments = subsequentPayments.map((payment) =>
      payment.id === id ? { ...payment, [field]: value } : payment
    );
    setSubsequentPayments(updatedPayments);
  };

  const removePayment = (index: number) => {
    setSubsequentPayments(subsequentPayments.filter((_, i) => i !== index));
  };

  const savePaymentData = () => {
    const eventUpdated = {
      ...selectedEvent,
      payment: {
        ...selectedEvent!.payment,
        subsequentPayments: [
          ...(selectedEvent!.payment.subsequentPayments as any[]),
          ...subsequentPayments
        ]
      }
    };
    setSubsequentPayments([]);
    console.log(eventUpdated);
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

  return (
    <>
      <Box mb='12px' pt='md'>
        <Flex justify='space-between'>
          <Flex
            gap='16px'
            p='10px'
            style={{
              borderRadius: '6px',
              border: 'solid 2px white'
            }}
          >
            <Text fw={600}>Cotizaciòn total del evento</Text>
            {isEditing ? (
              <Input
                type='number'
                value={editedTotalToPay}
                onChange={(e) => setEditedTotalToPay(e.target.value)}
              />
            ) : (
              <Text>
                ${Number(selectedEvent?.payment.totalToPay).toLocaleString()}
              </Text>
            )}
          </Flex>
          <Button onClick={handleEdit}>
            {isEditing ? 'Guardar' : 'Editar'}
          </Button>
        </Flex>
      </Box>
      <Box
        mb='16px'
        p='10px'
        style={{
          borderRadius: '6px',
          border: 'solid 2px white'
        }}
      >
        <Text fw={600} mb='8px'>
          Pagos parciales:
        </Text>
        <hr />
        <Box my='12px'>
          {selectedEvent.payment.subsequentPayments?.map((payment) => (
            <Box key={payment.id}>
              <Flex gap='8px'>
                <Text>{new Date(payment.date).toLocaleDateString()}</Text>
                <Text> - ${Number(payment.amount).toLocaleString()}</Text>
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
              type='number'
              placeholder='Monto'
              value={payment.amount.toLocaleString()}
              onChange={(e) =>
                updatePayment(payment.id, 'amount', e.target.value)
              }
              style={{ width: '120px' }}
            />
            <DateTimePicker
              placeholder='Fecha de pago'
              value={new Date(payment.date)}
              onChange={(date) => updatePayment(payment.id, 'date', date)}
              style={{ width: '200px' }}
            />
            <Button
              onClick={() => removePayment(subsequentPayments.indexOf(payment))}
              variant='outline'
              color='red'
              size='sm'
            >
              <IconTrash size={16} />
            </Button>
            <Button
              onClick={() => savePaymentData()}
              variant='outline'
              color='green'
              size='sm'
            >
              <IconCheck size={16} />
            </Button>
          </Group>
        </Box>
      ))}
      <Box
        p='10px'
        my='16px'
        style={{
          borderRadius: '6px',
          border: 'solid 2px white'
        }}
      >
        <Text fw={600}>Pago Inicial: ${initialPayment.toLocaleString()}</Text>
        <Text fw={600} mb='8px'>
          Suma de pagos parciales: ${sumOfPayments.toLocaleString()}
        </Text>
        <hr />
        <Text fw={600} my='8px'>
          Falta pagar: ${remainingPayment.toLocaleString()}
        </Text>
      </Box>
      {!subsequentPayments.length && (
        <Button onClick={addPayment}>Agregar pago</Button>
      )}
    </>
  );
};

export default EditablePayments;

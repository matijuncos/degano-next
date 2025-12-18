import { EVENT_TABS } from '@/context/config';
import { EventModel } from '@/context/types';
import { Button, Input, Box, Text, Tooltip } from '@mantine/core';
import { DateValue, DateInput } from '@mantine/dates';
import { useState, useMemo, useEffect } from 'react';
import { formatPrice } from '@/utils/priceUtils';
const PaymentForm = ({
  event,
  onBackTab,
  onFinish,
  updateEvent,
  validateAllRequiredFields
}: {
  event: EventModel;
  onBackTab: Function;
  onFinish: Function;
  updateEvent?: Function;
  validateAllRequiredFields?: () => { isValid: boolean; errors: string[] };
}) => {
  const [payment, setPayment] = useState<EventModel>(event);
  const [formattedTotalToPay, setFormattedTotalToPay] = useState('');
  const [formattedUpfrontAmount, setFormattedUpfrontAmount] = useState('');

  // Sincronizar estado local con el prop event cuando el usuario navega
  useEffect(() => {
    if (event) {
      setPayment(event);
      // Formatear valores iniciales si existen
      if (event.payment?.totalToPay) {
        setFormattedTotalToPay(formatNumberInput(event.payment.totalToPay.toString()));
      }
      if (event.payment?.upfrontAmount) {
        setFormattedUpfrontAmount(formatNumberInput(event.payment.upfrontAmount.toString()));
      }
    }
  }, [event]);

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
    return payment.equipment.reduce(
      (total, equipment) => total + (equipment.rentalPrice || 0),
      0
    );
  }, [payment.equipment]);

  const save = async () => {
    // Limpiar los valores formateados antes de guardar
    const cleanedPayment = {
      ...payment,
      payment: {
        ...payment.payment,
        totalToPay: parseFormattedNumber(formattedTotalToPay),
        upfrontAmount: parseFormattedNumber(formattedUpfrontAmount)
      }
    };
    if (updateEvent) {
      updateEvent(cleanedPayment);
    }
    await onFinish(cleanedPayment);
  };
  const back = () => {
    // Limpiar los valores formateados antes de volver
    const cleanedPayment = {
      ...payment,
      payment: {
        ...payment.payment,
        totalToPay: parseFormattedNumber(formattedTotalToPay),
        upfrontAmount: parseFormattedNumber(formattedUpfrontAmount)
      }
    };
    if (updateEvent) {
      updateEvent(cleanedPayment);
    }
    onBackTab(EVENT_TABS.FILES, cleanedPayment);
  };

  const handleTotalToPayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formattedValue = formatNumberInput(e.target.value);
    setFormattedTotalToPay(formattedValue);

    // Actualizar el state con el valor numérico limpio
    setPayment({
      ...payment,
      payment: {
        ...payment.payment,
        totalToPay: parseFormattedNumber(formattedValue)
      }
    });
  };

  const handleUpfrontAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formattedValue = formatNumberInput(e.target.value);
    setFormattedUpfrontAmount(formattedValue);

    // Actualizar el state con el valor numérico limpio
    setPayment({
      ...payment,
      payment: {
        ...payment.payment,
        upfrontAmount: parseFormattedNumber(formattedValue)
      }
    });
  };
  const handleDates = (value: string | DateValue, name: string) => {
    setPayment({
      ...payment,
      payment: {
        ...payment.payment,
        [name]: value
      }
    });
  };

  // Validar campos requeridos
  const validation = validateAllRequiredFields ? validateAllRequiredFields() : { isValid: true, errors: [] };
  const canFinish = validation.isValid;
  const errorMessage = validation.errors.length > 0
    ? `Faltan completar campos obligatorios: ${validation.errors.join(', ')}`
    : '';

  return (
    <div>
      <h3>Datos de pago</h3>

      {/* Costo de Renta del Equipamiento */}
      <Box
        mb='16px'
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

      <Input
        type='text'
        placeholder='Monto total del evento ($)'
        onChange={handleTotalToPayChange}
        name='totalToPay'
        value={formattedTotalToPay}
        mb='16px'
      />
      <div className='inputs-grid'>
        <Input
          type='text'
          placeholder='Monto del pago inicial ($)'
          onChange={handleUpfrontAmountChange}
          name='upfrontAmount'
          value={formattedUpfrontAmount}
        />
        <DateInput
          name='partialPaymentDate'
          locale='es'
          valueFormat='DD/MM/YYYY'
          placeholder='Fecha de pago inicial'
          onChange={(value) => handleDates(value, 'partialPaymentDate')}
        />
      </div>
      <div
        style={{
          display: 'flex',
          gap: '12px',
          flexDirection: 'column',
          marginTop: '16px'
        }}
      >
        <Button variant='brand' onClick={back}>
          Atrás
        </Button>
        <Tooltip
          label={errorMessage}
          disabled={canFinish}
          position='top'
          withArrow
        >
          <Button
            variant='brand'
            onClick={save}
            disabled={!canFinish}
            style={{ width: '100%' }}
          >
            Finalizar Evento
          </Button>
        </Tooltip>
      </div>
    </div>
  );
};
export default PaymentForm;

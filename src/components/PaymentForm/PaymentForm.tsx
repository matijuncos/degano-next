import { EVENT_TABS } from '@/context/config';
import { EventModel, BudgetAnnex } from '@/context/types';
import { Button, Input, Box, Text, Tooltip, Grid, Divider, ActionIcon, Group, FileButton } from '@mantine/core';
import { DateValue, DateInput } from '@mantine/dates';
import { useState, useMemo, useEffect } from 'react';
import { formatPrice } from '@/utils/priceUtils';
import { usePermissions } from '@/hooks/usePermissions';
import { IconTrash, IconPlus, IconUpload, IconFile, IconEye } from '@tabler/icons-react';
const PaymentForm = ({
  event,
  onBackTab,
  onFinish,
  updateEvent,
  onFormDataChange,
  validateAllRequiredFields
}: {
  event: EventModel;
  onBackTab: Function;
  onFinish: Function;
  updateEvent?: Function;
  onFormDataChange?: (data: EventModel) => void;
  validateAllRequiredFields?: () => { isValid: boolean; errors: string[] };
}) => {
  const { isAdmin } = usePermissions();
  const [payment, setPayment] = useState<EventModel>(event);
  const [formattedTotalToPay, setFormattedTotalToPay] = useState('');
  const [formattedUpfrontAmount, setFormattedUpfrontAmount] = useState('');
  const [annexes, setAnnexes] = useState<BudgetAnnex[]>(
    event.payment?.annexes || []
  );
  const [budgetFileUrl, setBudgetFileUrl] = useState<string>(
    event.payment?.budgetFileUrl || ''
  );
  const [uploading, setUploading] = useState(false);

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
      // Sincronizar anexos y archivo de presupuesto
      setAnnexes(event.payment?.annexes || []);
      setBudgetFileUrl(event.payment?.budgetFileUrl || '');
    }
  }, [event]);

  // Notificar al padre cuando cambian los datos (para persistir al cambiar de tab)
  useEffect(() => {
    if (onFormDataChange) {
      onFormDataChange(payment);
    }
  }, [payment, onFormDataChange]);

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
    onBackTab(EVENT_TABS.STAFF, cleanedPayment);
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
    // Sincronizar con payment
    setPayment(prev => ({
      ...prev,
      payment: {
        ...prev.payment,
        annexes: newAnnexes
      }
    }));
  };

  const updateAnnex = (id: string, field: 'description' | 'amount', value: string) => {
    const processedValue = field === 'amount' ? formatNumberInput(value) : value;
    const newAnnexes = annexes.map(a =>
      a.id === id ? { ...a, [field]: processedValue } : a
    );
    setAnnexes(newAnnexes);
    // Sincronizar con payment (guardar amount como valor numérico limpio)
    setPayment(prev => ({
      ...prev,
      payment: {
        ...prev.payment,
        annexes: newAnnexes.map(a => ({
          ...a,
          amount: parseFormattedNumber(a.amount)
        }))
      }
    }));
  };

  const removeAnnex = (id: string) => {
    const newAnnexes = annexes.filter(a => a.id !== id);
    setAnnexes(newAnnexes);
    // Sincronizar con payment
    setPayment(prev => ({
      ...prev,
      payment: {
        ...prev.payment,
        annexes: newAnnexes.map(a => ({
          ...a,
          amount: parseFormattedNumber(a.amount)
        }))
      }
    }));
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
      // Sincronizar con payment
      setPayment(prev => ({
        ...prev,
        payment: {
          ...prev.payment,
          budgetFileUrl: url
        }
      }));
    } catch (error) {
      console.error('Error uploading file:', error);
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
      // Sincronizar con payment
      setPayment(prev => ({
        ...prev,
        payment: {
          ...prev.payment,
          budgetFileUrl: ''
        }
      }));
    } catch (error) {
      console.error('Error deleting file:', error);
    }
  };

  const getCleanFileName = (url: string) => {
    const parts = url.split('/');
    const fileName = parts[parts.length - 1];
    // Remover el prefijo nanoid (primeros 21 caracteres + guión)
    return fileName.length > 22 ? fileName.slice(22) : fileName;
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
      <Grid gutter="md">
        <Grid.Col span={{ base: 12, sm: 6 }}>
          <Input
            type='text'
            placeholder='Monto del pago inicial ($)'
            onChange={handleUpfrontAmountChange}
            name='upfrontAmount'
            value={formattedUpfrontAmount}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6 }}>
          <DateInput
            name='partialPaymentDate'
            locale='es'
            valueFormat='DD/MM/YYYY'
            placeholder='Fecha de pago inicial'
            value={payment.payment?.partialPaymentDate ? new Date(payment.payment.partialPaymentDate) : null}
            onChange={(value) => handleDates(value, 'partialPaymentDate')}
          />
        </Grid.Col>
      </Grid>
      <Divider my="md" />
      <Text fw={600} mb="sm">Anexos</Text>

      {annexes.map((annex) => (
        <Grid key={annex.id} gutter="sm" mb="sm" align="center">
          <Grid.Col span={6}>
            <Input
              placeholder="Descripción del anexo"
              value={annex.description}
              onChange={(e) => updateAnnex(annex.id, 'description', e.target.value)}
            />
          </Grid.Col>
          <Grid.Col span={4}>
            <Input
              placeholder="Monto ($)"
              value={annex.amount}
              onChange={(e) => updateAnnex(annex.id, 'amount', e.target.value)}
            />
          </Grid.Col>
          <Grid.Col span={2}>
            <ActionIcon color="red" variant="light" onClick={() => removeAnnex(annex.id)}>
              <IconTrash size={16} />
            </ActionIcon>
          </Grid.Col>
        </Grid>
      ))}

      <Button variant="light" leftSection={<IconPlus size={16} />} onClick={addAnnex}>
        Agregar anexo
      </Button>

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

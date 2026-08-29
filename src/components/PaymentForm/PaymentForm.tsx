import { EVENT_TABS } from '@/context/config';
import { EventModel, BudgetAnnex, BudgetFile } from '@/context/types';
import { Button, Input, Box, Text, Tooltip, Grid, Divider, ActionIcon, Group, FileButton } from '@mantine/core';
import { DateValue, DateInput } from '@mantine/dates';
import { useState, useMemo, useEffect } from 'react';
import { formatPrice } from '@/utils/priceUtils';
import { usePermissions } from '@/hooks/usePermissions';
import { IconTrash, IconPlus, IconUpload, IconFile, IconEye } from '@tabler/icons-react';
import { openS3File } from '@/utils/s3Utils';

const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const MAX_BUDGET_FILES = 10;

const getCleanFileName = (url: string) => {
  const parts = url.split('/');
  const fileName = parts[parts.length - 1];
  return fileName.length > 22 ? decodeURIComponent(fileName.slice(22)) : decodeURIComponent(fileName);
};
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
  const [budgetFiles, setBudgetFiles] = useState<BudgetFile[]>(
    event.payment?.budgetFiles || (event.payment?.budgetFileUrl
      ? [{ id: 'legacy', url: event.payment.budgetFileUrl, fileName: getCleanFileName(event.payment.budgetFileUrl), uploadedAt: '' }]
      : [])
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
      // Sincronizar anexos y archivos de presupuesto
      setAnnexes(event.payment?.annexes || []);
      setBudgetFiles(event.payment?.budgetFiles || (event.payment?.budgetFileUrl
        ? [{ id: 'legacy', url: event.payment.budgetFileUrl, fileName: getCleanFileName(event.payment.budgetFileUrl), uploadedAt: '' }]
        : []));
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

  // Calcular la suma de los anexos
  const annexesTotal = useMemo(() => {
    return annexes.reduce((sum, annex) => {
      const amount = Number(parseFormattedNumber(annex.amount));
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0);
  }, [annexes]);

  // Total ajustado = monto base + anexos
  const adjustedTotal = useMemo(() => {
    const baseTotal = Number(parseFormattedNumber(formattedTotalToPay));
    return (isNaN(baseTotal) ? 0 : baseTotal) + annexesTotal;
  }, [formattedTotalToPay, annexesTotal]);

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

  // Funciones para manejar archivos de presupuesto
  const handleUploadBudgetFiles = async (files: File[]) => {
    if (!files.length) return;

    // Validar límite de archivos
    if (budgetFiles.length + files.length > MAX_BUDGET_FILES) {
      alert(`Máximo ${MAX_BUDGET_FILES} archivos de presupuesto permitidos.`);
      return;
    }

    // Validar tamaño
    const oversizedFile = files.find(f => f.size > MAX_FILE_SIZE_BYTES);
    if (oversizedFile) {
      alert(`El archivo "${oversizedFile.name}" supera el límite de ${MAX_FILE_SIZE_MB} MB.`);
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
      setPayment(prev => ({
        ...prev,
        payment: {
          ...prev.payment,
          budgetFiles: newBudgetFiles
        }
      }));
    } catch (error) {
      console.error('Error uploading files:', error);
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
      setPayment(prev => ({
        ...prev,
        payment: {
          ...prev.payment,
          budgetFiles: newBudgetFiles
        }
      }));
    } catch (error) {
      console.error('Error deleting file:', error);
    }
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
        autoComplete='off'
      />
      <Grid gutter="md">
        <Grid.Col span={{ base: 12, sm: 6 }}>
          <Input
            type='text'
            placeholder='Monto del pago inicial ($)'
            onChange={handleUpfrontAmountChange}
            name='upfrontAmount'
            value={formattedUpfrontAmount}
            autoComplete='off'
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
              autoComplete='off'
            />
          </Grid.Col>
          <Grid.Col span={4}>
            <Input
              placeholder="Monto ($)"
              value={annex.amount}
              onChange={(e) => updateAnnex(annex.id, 'amount', e.target.value)}
              autoComplete='off'
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

      {/* Resumen de total ajustado */}
      {(annexes.length > 0 || annexesTotal !== 0) && (
        <Box
          mt='md'
          p='12px'
          style={{
            borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            backgroundColor: 'rgba(255, 255, 255, 0.05)'
          }}
        >
          <Text size='sm' c='dimmed' mb='4px'>
            Monto base: {formatPrice(Number(parseFormattedNumber(formattedTotalToPay)) || 0)}
          </Text>
          <Text size='sm' mb='4px'>
            Anexos: +{formatPrice(annexesTotal)}
          </Text>
          <Divider my='xs' />
          <Text fw={700} size='lg'>
            Total: {formatPrice(adjustedTotal)}
          </Text>
        </Box>
      )}

      {isAdmin && (
        <>
          <Divider my="md" />
          <Text fw={600} mb="sm">Archivos de presupuesto</Text>

          {budgetFiles.map((file) => (
            <Group key={file.id} mb="xs">
              <IconFile size={20} />
              <Text size="sm" style={{ flex: 1 }}>
                {file.fileName}
              </Text>
              <ActionIcon
                color="blue"
                variant="light"
                onClick={() => openS3File(file.url)}
              >
                <IconEye size={16} />
              </ActionIcon>
              <ActionIcon color="red" variant="light" onClick={() => handleDeleteBudgetFile(file)}>
                <IconTrash size={16} />
              </ActionIcon>
            </Group>
          ))}

          {budgetFiles.length < MAX_BUDGET_FILES && (
            <FileButton onChange={handleUploadBudgetFiles} accept="image/*,.pdf" multiple>
              {(props) => (
                <Button
                  {...props}
                  variant="light"
                  leftSection={<IconUpload size={16} />}
                  loading={uploading}
                >
                  Subir archivo{budgetFiles.length > 0 ? 's' : ''}
                </Button>
              )}
            </FileButton>
          )}

          {budgetFiles.length > 0 && (
            <Text size="xs" c="dimmed" mt="xs">
              {budgetFiles.length}/{MAX_BUDGET_FILES} archivos (máx. {MAX_FILE_SIZE_MB} MB c/u)
            </Text>
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

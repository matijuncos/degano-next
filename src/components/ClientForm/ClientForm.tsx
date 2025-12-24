import { EVENT_TABS } from '@/context/config';
import { EventModel, ExtraClient } from '@/context/types';
import {
  Button,
  Input,
  Select,
  Card,
  Text,
  Group,
  Divider,
  Badge,
  Box
} from '@mantine/core';
import { useState, useEffect } from 'react';
import { IconUserPlus, IconUserCheck, IconSearch } from '@tabler/icons-react';
import styles from './ClientForm.module.css';

interface Client {
  _id: string;
  fullName: string;
  phoneNumber: string;
  email?: string;
  age?: string;
  address?: string;
}

const ClientForm = ({
  event,
  onNextTab,
  onBackTab,
  validate,
  setValidate,
  updateEvent
}: {
  event: EventModel;
  onNextTab: Function;
  onBackTab: Function;
  validate: boolean;
  setValidate: Function;
  updateEvent?: Function;
}) => {
  const [clientData, setClientData] = useState<EventModel>({
    ...event,
    extraClients: event.extraClients || []
  });
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [isNewClient, setIsNewClient] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [mainClientConfirmed, setMainClientConfirmed] = useState(false);
  const [addingExtraClient, setAddingExtraClient] = useState(false);
  const [extraClients, setExtraClients] = useState<ExtraClient[]>(event.extraClients || []);
  const [extraClientData, setExtraClientData] = useState<ExtraClient>({
    _id: '',
    fullName: '',
    phoneNumber: '',
    email: '',
    age: '',
    address: '',
    rol: ''
  });
  const [isNewExtraClient, setIsNewExtraClient] = useState(false);
  const [selectedExtraClientId, setSelectedExtraClientId] = useState<
    string | null
  >(null);
  const [validateExtra, setValidateExtra] = useState(false);
  const [editingExtraIndex, setEditingExtraIndex] = useState<number | null>(
    null
  );
  const [isEditingExtra, setIsEditingExtra] = useState(false);

  const requiredMainFields: (keyof EventModel)[] = [
    'fullName',
    'phoneNumber',
    'rol'
  ];

  const requiredExtraFields: (keyof ExtraClient)[] = [
    'fullName',
    'rol'
  ];

  // Fetch clients on component mount
  useEffect(() => {
    fetchClients();
  }, []);

  // Sincronizar estado local con el prop event cuando el usuario navega entre tabs
  useEffect(() => {
    if (event && event.fullName && event.phoneNumber && event.rol) {
      setClientData({
        ...event,
        extraClients: event.extraClients || []
      });
      setMainClientConfirmed(true);
      setExtraClients(event.extraClients || []);
    }
  }, [event]);

  const fetchClients = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/getClients');
      const data = await response.json();
      if (data.clients) {
        setClients(data.clients);
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: any) => {
    setClientData({
      ...clientData,
      [e.target.name]: e.target.value
    });
  };

  const handleClientSelect = (clientId: string | null) => {
    setSelectedClientId(clientId);
    setIsNewClient(false);

    if (clientId) {
      const selectedClient = clients.find((client) => client._id === clientId);
      if (selectedClient) {
        setClientData({
          ...clientData,
          fullName: selectedClient.fullName,
          phoneNumber: selectedClient.phoneNumber,
          email: selectedClient.email,
          age: selectedClient.age || '',
          address: selectedClient.address || ''
        });
      }
    } else {
      // Clear form when no client is selected
      setClientData({
        ...clientData,
        fullName: '',
        phoneNumber: '',
        email: '',
        age: '',
        address: ''
      });
    }
  };

  const handleNewClient = () => {
    setIsNewClient(true);
    setSelectedClientId(null);
    setClientData({
      ...clientData,
      fullName: '',
      phoneNumber: '',
      email: '',
      age: '',
      address: ''
    });
  };

  const handleSwitchToExisting = () => {
    setIsNewClient(false);
    setSelectedClientId(null);
    // Clear form when switching to existing client mode
    setClientData({
      ...clientData,
      fullName: '',
      phoneNumber: '',
      email: '',
      age: '',
      address: ''
    });
  };

  const validateRequiredFields = () => {
    setValidate(true);

    // Si el cliente ya fue confirmado, solo validar los campos requeridos
    if (mainClientConfirmed) {
      const isValid: boolean = requiredMainFields.every(
        (field: keyof EventModel) =>
          clientData[field] && String(clientData[field]).trim() !== ''
      );
      return isValid;
    }

    // Si no fue confirmado, validar selección de cliente o modo nuevo
    if (!isNewClient && !selectedClientId) {
      return false;
    }

    const isValid: boolean = requiredMainFields.every(
      (field: keyof EventModel) =>
        clientData[field] && String(clientData[field]).trim() !== ''
    );
    return isValid;
  };

  const validateExtraClientFields = () => {
    setValidateExtra(true);
    const isValidExtra = requiredExtraFields.every(
      (field: keyof ExtraClient) =>
        extraClientData[field] && String(extraClientData[field]).trim() !== ''
    );
    return isValidExtra;
  };

  const handleConfirmClient = (isExtra = false) => {
    if (isExtra) {
      const isExtraValid = validateExtraClientFields();
      if (!isExtraValid) return;

      let updatedExtraClients: ExtraClient[];

      if (isEditingExtra && editingExtraIndex !== null) {
        updatedExtraClients = [...extraClients];
        updatedExtraClients[editingExtraIndex] = { ...extraClientData };
        setIsEditingExtra(false);
        setEditingExtraIndex(null);
      } else {
        // Agregar cliente extra al array
        updatedExtraClients = [...extraClients, extraClientData];
      }

      setExtraClients(updatedExtraClients);
      setClientData((prev) => ({
        ...prev,
        extraClients: updatedExtraClients
      }));

      // Limpiar formulario del cliente extra
      setExtraClientData({
        _id: '',
        fullName: '',
        phoneNumber: '',
        email: '',
        age: '',
        address: '',
        rol: ''
      });
      setAddingExtraClient(false);
      setValidateExtra(false);
    } else {
      const isValid = validateRequiredFields();
      if (!isValid) return;
      setMainClientConfirmed(true);
    }
  };

  const handleExtraInputChange = (e: any) => {
    setExtraClientData({
      ...extraClientData,
      [e.target.name]: e.target.value
    });
  };

  const next = () => {
    // Siempre validar campos requeridos antes de avanzar
    if (!validateRequiredFields()) {
      return;
    }

    // Guardar datos antes de avanzar
    if (updateEvent) {
      updateEvent(clientData);
    }

    setValidate(false);

    // Si el cliente no fue confirmado, confirmarlo
    if (!mainClientConfirmed) {
      handleConfirmClient(false);
    }

    onNextTab(EVENT_TABS.EVENT, clientData);
  };

  // Filter clients based on search term
  const filteredClients = clients
    .filter(
      (client) =>
        client.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.phoneNumber.includes(searchTerm)
    )
    .filter(
      (client) =>
        client._id !== selectedClientId &&
        client.fullName !== clientData.fullName
    )
    .filter(
      (client) =>
        !extraClients.some((extra) => extra._id && extra._id === client._id)
    )
    .filter((client) => client.fullName && client.fullName.trim() !== '');

  const clientOptions = filteredClients
    .sort((a, b) => a.fullName.localeCompare(b.fullName))
    .map((client) => ({
      value: client._id,
      label: `${client.fullName} - ${client.phoneNumber}`
    }));

  const handleExtraClientSelect = (clientId: string | null) => {
    setSelectedExtraClientId(clientId);
    setIsNewExtraClient(false);

    if (clientId) {
      const selectedClient = clients.find((client) => client._id === clientId);
      if (selectedClient) {
        setExtraClientData({
          ...extraClientData,
          fullName: selectedClient.fullName,
          phoneNumber: selectedClient.phoneNumber,
          email: selectedClient.email,
          age: selectedClient.age || '',
          address: selectedClient.address || '',
          rol: extraClientData.rol || ''
        });
      }
    } else {
      setExtraClientData({
        _id: '',
        fullName: '',
        phoneNumber: '',
        email: '',
        age: '',
        address: '',
        rol: ''
      });
    }
  };

  const handleEditExtraClient = (index: number) => {
    const clientToEdit = extraClients[index];
    setExtraClientData({ ...clientToEdit });
    setEditingExtraIndex(index);
    setIsEditingExtra(true);
    setAddingExtraClient(true);
    setIsNewExtraClient(true);
    setSelectedExtraClientId(clientToEdit._id || null);
    setValidateExtra(false);
  };

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>Datos del cliente</h3>

      {/* Client Selection Section */}
      {!mainClientConfirmed && (
        <Card
          shadow='sm'
          padding='lg'
          radius='md'
          withBorder
          mb='md'
          className={styles.selectionCard}
        >
          <Group justify='space-between' mb='md'>
            <Text fw={500} size='lg'>
              Seleccionar Cliente
            </Text>
            <Badge
              color={isNewClient ? 'blue' : 'green'}
              variant='light'
              leftSection={
                isNewClient ? (
                  <IconUserPlus size={14} />
                ) : (
                  <IconUserCheck size={14} />
                )
              }
              className={styles.badge}
            >
              {isNewClient ? 'Nuevo Cliente' : 'Cliente Existente'}
            </Badge>
          </Group>

          {!isNewClient && (
            <>
              <Select
                placeholder='Buscar cliente existente...'
                data={clientOptions}
                value={selectedClientId}
                onChange={handleClientSelect}
                searchable
                clearable
                leftSection={<IconSearch size={16} />}
                mb='md'
                error={validate && !selectedClientId}
              />

              {selectedClientId && (
                <Card
                  withBorder
                  p='sm'
                  bg='gray.7'
                  color='white'
                  className={styles.selectedClientCard}
                >
                  <Text size='sm' mb='xs'>
                    Cliente seleccionado:
                  </Text>
                  <Box pl='md'>
                    <Text fw={500}>{clientData.fullName}</Text>
                    <Text size='sm'>
                      Teléfono: {clientData.phoneNumber}
                    </Text>
                  </Box>
                </Card>
              )}
            </>
          )}

          {isNewClient && (
            <Card
              withBorder
              p='sm'
              bg='green.0'
              className={styles.selectedClientCard}
            >
              <Text size='sm' c='black' mb='xs'>
                📝 Creando nuevo cliente
              </Text>
              <Text size='sm' c='dimmed'>
                Completa la información del cliente a continuación
              </Text>
            </Card>
          )}

          <Divider my='md' className={styles.divider} />

          <Group className={styles.buttonGroup}>
            {!isNewClient && (
              <Button
                variant='outline'
                leftSection={<IconUserPlus size={16} />}
                onClick={handleNewClient}
                size='sm'
              >
                Crear Nuevo Cliente
              </Button>
            )}

            {isNewClient && (
              <Button
                variant='outline'
                leftSection={<IconUserCheck size={16} />}
                onClick={handleSwitchToExisting}
                size='sm'
              >
                Seleccionar Existente
              </Button>
            )}
          </Group>
        </Card>
      )}

      {/* Client Form Section */}
      {mainClientConfirmed ||
          <Card
            shadow='sm'
            padding='lg'
            radius='md'
            withBorder
            className={styles.formCard}
          >
            <Text fw={500} size='lg' mb='md'>
              {isNewClient
                ? '📝 Información del Nuevo Cliente'
                : selectedClientId
                ? '👤 Información del Cliente Seleccionado'
                : '👤 Información del Cliente'}
            </Text>

            {!isNewClient && !selectedClientId && (
              <Text
                c={validate ? 'red' : 'dimmed'}
                size='sm'
                mb='md'
                ta='center'
              >
                {validate
                  ? '⚠️ Por favor selecciona un cliente existente'
                  : 'Selecciona un cliente existente arriba para ver su información'}
              </Text>
            )}

            <div className={styles.inputsGrid}>
              <Input
                placeholder='Nombre y Apellido *'
                name='fullName'
                onChange={handleInputChange}
                autoComplete='off'
                error={validate && !clientData.fullName}
                value={clientData.fullName || ''}
                disabled={!isNewClient && !selectedClientId}
              />
              <Input
                placeholder='Teléfono *'
                name='phoneNumber'
                onChange={handleInputChange}
                autoComplete='off'
                error={validate && !clientData.phoneNumber}
                value={clientData.phoneNumber || ''}
                disabled={!isNewClient && !selectedClientId}
              />
              <Input
                placeholder='Rol en el evento *'
                name='rol'
                onChange={handleInputChange}
                autoComplete='off'
                error={validate && !clientData.rol}
                value={clientData.rol || ''}
                disabled={!isNewClient && !selectedClientId}
              />
              <Input
                placeholder='Edad'
                name='age'
                onChange={handleInputChange}
                autoComplete='off'
                value={clientData.age || ''}
                disabled={!isNewClient && !selectedClientId}
              />
              <Input
                placeholder='Dirección'
                name='address'
                onChange={handleInputChange}
                autoComplete='off'
                value={clientData.address || ''}
                disabled={!isNewClient && !selectedClientId}
              />
            </div>
          </Card>
        }

      {mainClientConfirmed && (
        <Card withBorder mt='md'>
          <Text fw={500} size='lg'>
            Cliente principal confirmado
          </Text>
          <Box mt='xs' mb='sm'>
            <Text>{clientData.fullName} ({clientData.rol})</Text>
            <Text size='sm'>Tel: {clientData.phoneNumber}</Text>
            {clientData.address && <Text size='sm'>Dirección: {clientData.address}</Text>}
          </Box>
          <Group>
            <Button
              variant='outline'
              onClick={() => setMainClientConfirmed(false)}
            >
              Editar cliente principal
            </Button>
            <Button
              variant='light'
              leftSection={<IconUserPlus size={16} />}
              onClick={() => {
                setAddingExtraClient(true);
                setSelectedExtraClientId(null);
                setIsNewExtraClient(false);
                setExtraClientData({
                  _id: '',
                  fullName: '',
                  phoneNumber: '',
                  email: '',
                  age: '',
                  address: '',
                  rol: ''
                });
                setValidateExtra(false);
              }}
            >
              Agregar cliente extra
            </Button>
          </Group>
        </Card>
      )}

      {addingExtraClient && (
        <Card mt='md' withBorder padding='lg'>
          <Card shadow='sm' padding='md' radius='md' withBorder mb='md'>
            <Group justify='space-between' mb='md'>
              <Text fw={500}>{isNewExtraClient ? 'Crear Nuevo Cliente Extra' : 'Seleccionar Cliente Extra'}</Text>
              <Badge
                color={isNewExtraClient ? 'blue' : 'green'}
                variant='light'
                leftSection={
                  isNewExtraClient ? (
                    <IconUserPlus size={14} />
                  ) : (
                    <IconUserCheck size={14} />
                  )
                }
              >
                {isNewExtraClient ? 'Nuevo Cliente Extra' : 'Cliente Existente'}
              </Badge>
            </Group>

            {!isNewExtraClient && (
              <>
                <Select
                  placeholder='Buscar cliente existente...'
                  data={clientOptions}
                  value={selectedExtraClientId}
                  onChange={handleExtraClientSelect}
                  searchable
                  clearable
                  leftSection={<IconSearch size={16} />}
                  mb='md'
                />

                {selectedExtraClientId && (
                  <Card withBorder p='sm' bg='gray.7' color='white'>
                    <Text size='sm' mb='xs'>
                      Cliente seleccionado:
                    </Text>
                    <Box pl='md'>
                      <Text fw={500}>{extraClientData.fullName}</Text>
                      <Text size='sm'>
                        Teléfono: {extraClientData.phoneNumber}
                      </Text>
                    </Box>
                  </Card>
                )}
              </>
            )}
            <Group>
              {!isNewExtraClient && (
                <Button
                  variant='outline'
                  leftSection={<IconUserPlus size={16} />}
                  style={{ marginTop: '8px' }}
                  onClick={() => {
                    setIsNewExtraClient(true);
                    setSelectedExtraClientId(null);
                    setExtraClientData({
                      _id: '',
                      fullName: '',
                      phoneNumber: '',
                      email: '',
                      age: '',
                      address: '',
                      rol: ''
                    });
                  }}
                  size='sm'
                >
                  Crear Nuevo Cliente Extra
                </Button>
              )}

              {isNewExtraClient && (
                <Button
                  variant='outline'
                  leftSection={<IconUserCheck size={16} />}
                  onClick={() => {
                    setIsNewExtraClient(false);
                    setSelectedExtraClientId(null);
                    setExtraClientData({
                      _id: '',
                      fullName: '',
                      phoneNumber: '',
                      email: '',
                      age: '',
                      address: '',
                      rol: ''
                    });
                  }}
                  size='sm'
                >
                  Seleccionar Existente
                </Button>
              )}
            </Group>
          </Card>

          <div className={styles.inputsGrid}>
            <Input
              placeholder='Nombre y Apellido *'
              name='fullName'
              error={validateExtra && !extraClientData.fullName}
              value={extraClientData.fullName}
              onChange={handleExtraInputChange}
              disabled={!isNewExtraClient && !selectedExtraClientId}
            />
            <Input
              placeholder='Teléfono'
              name='phoneNumber'
              error={validateExtra && !extraClientData.phoneNumber}
              value={extraClientData.phoneNumber}
              onChange={handleExtraInputChange}
              disabled={!isNewExtraClient && !selectedExtraClientId}
            />
            <Input
              placeholder='Rol en el evento *'
              name='rol'
              error={validateExtra && !extraClientData.rol}
              value={extraClientData.rol}
              onChange={handleExtraInputChange}
            />
            <Input
              placeholder='Edad'
              name='age'
              value={extraClientData.age}
              onChange={handleExtraInputChange}
            />
            <Input
              placeholder='Dirección'
              name='address'
              value={extraClientData.address}
              onChange={handleExtraInputChange}
            />
          </div>

          <Group mt='md'>
            <Button onClick={() => handleConfirmClient(true)}>
              {isEditingExtra ? 'Guardar cambios' : 'Confirmar cliente extra'}
            </Button>
            <Button
              variant='light'
              color='gray'
              onClick={() => setAddingExtraClient(false)}
            >
              Cancelar
            </Button>
          </Group>
        </Card>
      )}

      {extraClients.length > 0 && (
        <Card withBorder mt='md'>
          <Text fw={500} size='lg' mb='sm'>
            Clientes extra confirmados
          </Text>
          {extraClients.map((c, i) => (
            <Box key={i} mb='xs'>
              <Group justify='space-between' align='center'>
                <Box>
                  <Text>
                    {i + 1}. {c.fullName} ({c.rol})
                  </Text>
                  <Text size='sm'>
                    Tel: {c.phoneNumber}
                  </Text>
                </Box>
                <Button
                  size='xs'
                  variant='light'
                  onClick={() => handleEditExtraClient(i)}
                >
                  Editar
                </Button>
              </Group>
            </Box>
          ))}
        </Card>
      )}

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {!mainClientConfirmed && (
          <Button
            mt='md'
            variant='light'
            color='green'
            onClick={() => handleConfirmClient(false)}
            disabled={clientData.fullName === ''}
          >
            Confirmar cliente principal
          </Button>
        )}
        <Button
          mt='16px'
          onClick={next}
          loading={loading}
          className={styles.nextButton}
        >
          Siguiente
        </Button>
      </div>
    </div>
  );
};

export default ClientForm;

import { EVENT_TABS } from '@/context/config';
import { EventModel } from '@/context/types';
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
  email: string;
  age?: string;
  address?: string;
}

const ClientForm = ({
  event,
  onNextTab,
  onBackTab,
  validate,
  setValidate
}: {
  event: EventModel;
  onNextTab: Function;
  onBackTab: Function;
  validate: boolean;
  setValidate: Function;
}) => {
  const [clientData, setClientData] = useState<EventModel>(event);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [isNewClient, setIsNewClient] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const requiredFields: (keyof EventModel)[] = [
    'fullName',
    'phoneNumber',
    'email'
  ];

  // Fetch clients on component mount
  useEffect(() => {
    fetchClients();
  }, []);

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

    // If in existing client mode but no client is selected, show error
    if (!isNewClient && !selectedClientId) {
      return false;
    }

    const isValid: boolean = requiredFields.every(
      (field: keyof EventModel) =>
        clientData[field] && String(clientData[field]).trim() !== ''
    );
    return isValid;
  };

  const next = () => {
    if (validateRequiredFields()) {
      setValidate(false);
      onNextTab(EVENT_TABS.EVENT, clientData);
    }
  };

  // Filter clients based on search term
  const filteredClients = clients.filter(
    (client) =>
      client.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.phoneNumber.includes(searchTerm)
  );

  const clientOptions = filteredClients.map((client) => ({
    value: client._id,
    label: `${client.fullName} - ${client.email}`
  }));

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>Datos del cliente</h3>

      {/* Client Selection Section */}
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
                    Teléfono: {clientData.phoneNumber} • Email:{' '}
                    {clientData.email}
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

      {/* Client Form Section */}
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
          <Text c={validate ? 'red' : 'dimmed'} size='sm' mb='md' ta='center'>
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
            placeholder='Dirección de email *'
            name='email'
            onChange={handleInputChange}
            autoComplete='off'
            error={validate && !clientData.email}
            value={clientData.email || ''}
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

      <div style={{ display: 'flex', flexDirection: 'column' }}>
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

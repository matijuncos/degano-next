'use client';
import 'dayjs/locale/es';
import EditableData from '@/components/EditableData/EditableData';
import EditablePayments from '@/components/EditablePayments/EditablePayments';
import EquipmentTable from '@/components/EquipmentTable/EquipmentTable';
import Loader from '@/components/Loader/Loader';
import PrintableEvent from '@/components/PrintableEvent/PrintableEvent';
import PDFActions from '@/components/PDFActions/PDFActions';
import useLoadingCursor from '@/hooks/useLoadingCursor';
import { useDeganoCtx } from '@/context/DeganoContext';
import { Band, EventModel } from '@/context/types';
import { withPageAuthRequired } from '@auth0/nextjs-auth0/client';
import { combineDateAndTime, toTimeString } from '@/utils/dateUtils';
import { DateValue, TimePicker } from '@mantine/dates';
import {
  Accordion,
  Box,
  Button,
  Container,
  Grid,
  Title,
  Divider,
  Flex,
  Switch,
  Tabs,
  Text,
  Card,
  Badge,
  Select,
  Input,
  Group,
  Textarea
} from '@mantine/core';
import { IconUserPlus, IconUserCheck, IconSearch, IconArrowLeft, IconPlus } from '@tabler/icons-react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import { useUser } from '@auth0/nextjs-auth0/client';
import FilesHandlerComponent from '@/components/FilesHandlerComponent/FilesHandlerComponent';
import SpotifyTable from '@/components/SpotifyTable/SpotifyTable';
import BandList from '@/components/BandManager/BandList';
import EditableBand from '@/components/BandManager/EditableBand';
import useNotification from '@/hooks/useNotification';
import useSWR from 'swr';

const AccordionSet = ({
  children,
  value
}: {
  children: JSX.Element | JSX.Element[];
  value: string;
}) => {
  return (
    <Accordion>
      <Accordion.Item value={value}>
        <Accordion.Control>{value}</Accordion.Control>
        <Accordion.Panel
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.02)'
          }}
        >
          <>{children}</>
        </Accordion.Panel>
      </Accordion.Item>
    </Accordion>
  );
};

const MainInformation = ({
  selectedEvent
}: {
  selectedEvent: EventModel | null;
}) => {
  const [addingExtraClient, setAddingExtraClient] = useState(false);
  const [isNewExtraClient, setIsNewExtraClient] = useState(false);
  const [selectedExtraClientId, setSelectedExtraClientId] = useState<
    string | null
  >(null);
  const [extraClientData, setExtraClientData] = useState<{
    _id?: string;
    fullName: string;
    phoneNumber: string;
    email?: string;
    rol: string;
    age?: string;
    address?: string;
  }>({
    fullName: '',
    phoneNumber: '',
    email: '',
    rol: '',
    age: '',
    address: ''
  });
  const [validateExtra, setValidateExtra] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const { setSelectedEvent } = useDeganoCtx();
  const setLoadingCursor = useLoadingCursor();
  const notify = useNotification();

  // Estados para manejar fecha y hora por separado
  const [dateOnly, setDateOnly] = useState<DateValue>(
    selectedEvent?.date ? new Date(selectedEvent.date) : null
  );
  const [timeOnly, setTimeOnly] = useState<string>(
    selectedEvent?.date ? toTimeString(new Date(selectedEvent.date)) : ''
  );
  const [endDateOnly, setEndDateOnly] = useState<DateValue>(
    selectedEvent?.endDate ? new Date(selectedEvent.endDate) : null
  );
  const [endTimeOnly, setEndTimeOnly] = useState<string>(
    selectedEvent?.endDate ? toTimeString(new Date(selectedEvent.endDate)) : ''
  );


  // Sincronizar estados cuando cambia selectedEvent
  useEffect(() => {
    if (selectedEvent?.date) {
      setDateOnly(new Date(selectedEvent.date));
      setTimeOnly(toTimeString(new Date(selectedEvent.date)));
    }
    if (selectedEvent?.endDate) {
      setEndDateOnly(new Date(selectedEvent.endDate));
      setEndTimeOnly(toTimeString(new Date(selectedEvent.endDate)));
    }
  }, [selectedEvent?.date, selectedEvent?.endDate]);

  // Función para actualizar el evento
  const updateEventData = async (updates: Partial<EventModel>) => {
    if (!selectedEvent) return;
    setLoadingCursor(true);
    notify({ loading: true });
    const timeStamp = new Date().toISOString();
    try {
      const updatedEvent = { ...selectedEvent, ...updates };
      const response = await fetch(`/api/updateEvent?id=${timeStamp}`, {
        method: 'PUT',
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatedEvent)
      });
      await response.json();
      setSelectedEvent(updatedEvent);
      notify();
    } catch (error) {
      notify({ type: 'defaultError' });
      console.error('Error updating event:', error);
    } finally {
      setLoadingCursor(false);
    }
  };


  // Solo cargar clientes cuando se abre el formulario de agregar cliente extra
  useEffect(() => {
    if (addingExtraClient && clients.length === 0) {
      fetchClients();
    }
  }, [addingExtraClient]);

  const fetchClients = async () => {
    try {
      const response = await fetch('/api/getClients');
      const data = await response.json();
      if (data.clients) {
        setClients(data.clients);
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const handleExtraInputChange = (e: any) => {
    setExtraClientData({
      ...extraClientData,
      [e.target.name]: e.target.value
    });
  };

  const handleExtraClientSelect = (clientId: string | null) => {
    setSelectedExtraClientId(clientId);
    setIsNewExtraClient(false);

    if (clientId) {
      const selectedClient = clients.find((client) => client._id === clientId);
      if (selectedClient) {
        setExtraClientData({
          _id: selectedClient._id,
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
        fullName: '',
        phoneNumber: '',
        email: '',
        age: '',
        address: '',
        rol: ''
      });
    }
  };

  const validateExtraClientFields = () => {
    setValidateExtra(true);
    return !!(extraClientData.fullName && extraClientData.rol);
  };

  const handleAddExtraClient = async () => {
    if (!validateExtraClientFields()) return;
    if (!selectedEvent) return;

    setLoadingCursor(true);
    notify({ loading: true });

    try {
      const updatedExtraClients = [
        ...selectedEvent.extraClients,
        extraClientData
      ];
      const response = await fetch('/api/updateEvent', {
        method: 'PUT',
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          _id: selectedEvent._id,
          extraClients: updatedExtraClients
        })
      });

      const { event } = await response.json();
      setSelectedEvent(event);
      setAddingExtraClient(false);
      setExtraClientData({
        fullName: '',
        phoneNumber: '',
        email: '',
        rol: '',
        age: '',
        address: ''
      });
      setValidateExtra(false);
      setSelectedExtraClientId(null);
      notify({ message: 'Cliente extra agregado correctamente' });
    } catch (error) {
      notify({ type: 'defaultError' });
      console.error('Error adding extra client:', error);
    } finally {
      setLoadingCursor(false);
    }
  };

  const filteredClients = clients
    .filter(
      (client) =>
        client.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.phoneNumber.includes(searchTerm)
    )
    .filter(
      (client) =>
        !selectedEvent?.extraClients.some(
          (extra) => extra._id && extra._id === client._id
        )
    )
    .filter((client) => client.fullName !== selectedEvent?.fullName);

  const clientOptions = filteredClients.map((client) => ({
    value: client._id,
    label: `${client.fullName} - ${client.phoneNumber}`
  }));

  if (!selectedEvent) return null;
  return (
    <Flex direction='column' gap='8px' mt='8px'>
      {/* SECCIÓN: DATOS DEL EVENTO */}
      <Text size='lg' fw={700} mb='md'>
        Datos del evento
      </Text>
      <EditableData
        type='dateOnly'
        property='date'
        title='Fecha de evento'
        value={dateOnly ? new Date(dateOnly).toLocaleDateString('es-AR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        }) : 'Sin fecha'}
        onSave={(value) => {
          setDateOnly(value);
          if (value && timeOnly && selectedEvent) {
            const combined = combineDateAndTime(value, timeOnly);
            if (combined) {
              updateEventData({ date: combined });
            }
          }
        }}
      />
      <EditableData
        type='timeOnly'
        property='date'
        title='Hora de inicio'
        value={timeOnly}
        onSave={(value) => {
          setTimeOnly(value);
          if (dateOnly && value && selectedEvent) {
            const combined = combineDateAndTime(dateOnly, value);
            if (combined) {
              updateEventData({ date: combined });
            }
          }
        }}
      />
      {selectedEvent.endDate && (
        <EditableData
          type='dateOnly'
          property='endDate'
          title='Fecha finalización'
          value={endDateOnly ? new Date(endDateOnly).toLocaleDateString('es-AR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          }) : 'Sin fecha'}
          onSave={(value) => {
            setEndDateOnly(value);
            if (value && endTimeOnly && selectedEvent) {
              const combined = combineDateAndTime(value, endTimeOnly);
              if (combined) {
                updateEventData({ endDate: combined });
              }
            }
          }}
        />
      )}
      {selectedEvent.endDate && (
        <EditableData
          type='timeOnly'
          property='endDate'
          title='Hora de finalización'
          value={endTimeOnly}
          onSave={(value) => {
            setEndTimeOnly(value);
            if (endDateOnly && value && selectedEvent) {
              const combined = combineDateAndTime(endDateOnly, value);
              if (combined) {
                updateEventData({ endDate: combined });
              }
            }
          }}
        />
      )}
      <EditableData
        type='text'
        property='type'
        title='Tipo de evento'
        value={selectedEvent.type}
      />
      {selectedEvent.company && (
        <EditableData
          type='text'
          property='company'
          title='Empresa'
          value={selectedEvent.company}
        />
      )}
      <EditableData
        type='text'
        property='guests'
        title='Cantidad de Invitados'
        value={selectedEvent.guests}
      />

      <Divider my='md' />

      {/* SECCIÓN: UBICACIÓN */}
      <Text size='lg' fw={700} mb='md'>
        Ubicación
      </Text>
      <EditableData
        type='text'
        property='lugar'
        title='Lugar'
        value={selectedEvent.lugar}
      />
      <EditableData
        type='text'
        property='eventCity'
        title='Localidad'
        value={selectedEvent.eventCity}
      />
      {selectedEvent.eventAddress && (
        <EditableData
          type='text'
          property='eventAddress'
          title='Dirección'
          value={selectedEvent.eventAddress}
        />
      )}
      {selectedEvent.venueContact && (
        <EditableData
          type='text'
          property='venueContact'
          title='Contacto de lugar'
          value={selectedEvent.venueContact}
        />
      )}

      <Divider my='md' />

      {/* SECCIÓN: HORARIOS */}
      <Text size='lg' fw={700} mb='md'>
        Horarios
      </Text>
      {selectedEvent.churchDate && (
        <EditableData
          type='text'
          property='churchDate'
          title='Hora de iglesia'
          value={selectedEvent.churchDate}
        />
      )}
      {selectedEvent.civil && (
        <EditableData
          type='text'
          property='civil'
          title='Hora del civil'
          value={selectedEvent.civil}
        />
      )}
      {selectedEvent.staffArrivalTime && (
        <EditableData
          type='text'
          property='staffArrivalTime'
          title='Horario llegada staff'
          value={selectedEvent.staffArrivalTime}
        />
      )}
      {selectedEvent.equipmentArrivalTime && (
        <EditableData
          type='text'
          property='equipmentArrivalTime'
          title='Horario llegada equipamiento'
          value={selectedEvent.equipmentArrivalTime}
        />
      )}

      <Divider my='md' />

      {/* SECCIÓN: CLIENTE */}
      <Text size='lg' fw={700} mb='md'>
        Cliente
      </Text>
      <EditableData
        type='text'
        property='fullName'
        title='Nombre Cliente'
        value={selectedEvent.fullName}
      />
      <EditableData
        type='text'
        property='phoneNumber'
        title='Teléfono'
        value={selectedEvent.phoneNumber}
      />
      {selectedEvent.email && (
        <EditableData
          type='text'
          property='email'
          title='Email'
          value={selectedEvent.email}
        />
      )}
      {selectedEvent.rol && (
        <EditableData
          type='text'
          property='rol'
          title='Rol en el evento'
          value={selectedEvent.rol}
        />
      )}
      {selectedEvent.age && (
        <EditableData
          type='text'
          property='age'
          title='Edad'
          value={selectedEvent.age}
        />
      )}
      {selectedEvent.address && (
        <EditableData
          type='text'
          property='address'
          title='Dirección'
          value={selectedEvent.address}
        />
      )}

      {/* Clientes Extras */}
      {selectedEvent.extraClients.length > 0 &&
        selectedEvent.extraClients.map((client, index) => (
          <React.Fragment key={`extra-client-${index}`}>
            <EditableData
              type='text'
              property={`extraClients.${index}.fullName`}
              title={`Nombre Cliente Extra ${index + 1}`}
              value={client.fullName}
            />
            <EditableData
              type='text'
              property={`extraClients.${index}.phoneNumber`}
              title={`Teléfono Cliente Extra ${index + 1}`}
              value={client.phoneNumber}
            />
            {client.email && (
              <EditableData
                type='text'
                property={`extraClients.${index}.email`}
                title={`Email Cliente Extra ${index + 1}`}
                value={client.email}
              />
            )}
            {client.rol && (
              <EditableData
                type='text'
                property={`extraClients.${index}.rol`}
                title={`Rol Cliente Extra ${index + 1}`}
                value={client.rol}
              />
            )}
            {client.age && (
              <EditableData
                type='text'
                property={`extraClients.${index}.age`}
                title={`Edad Cliente Extra ${index + 1}`}
                value={client.age}
              />
            )}
            {client.address && (
              <EditableData
                type='text'
                property={`extraClients.${index}.address`}
                title={`Dirección Cliente Extra ${index + 1}`}
                value={client.address}
              />
            )}
          </React.Fragment>
        ))}

      {/* Botón para agregar cliente extra */}
      <Button
        variant='light'
        leftSection={<IconUserPlus size={16} />}
        onClick={() => {
          setAddingExtraClient(true);
          setSelectedExtraClientId(null);
          setIsNewExtraClient(false);
          setExtraClientData({
            fullName: '',
            phoneNumber: '',
            email: '',
            age: '',
            address: '',
            rol: ''
          });
          setValidateExtra(false);
        }}
        mt='md'
      >
        Agregar cliente extra
      </Button>

      {/* Formulario para agregar cliente extra */}
      {addingExtraClient && (
        <Card mt='md' withBorder padding='lg'>
          <Card shadow='sm' padding='md' radius='md' withBorder mb='md'>
            <Group justify='space-between' mb='md'>
              <Text fw={500}>
                {isNewExtraClient
                  ? 'Crear Nuevo Cliente Extra'
                  : 'Seleccionar Cliente Extra'}
              </Text>
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

          <Flex direction='column' gap='md'>
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
              value={extraClientData.phoneNumber}
              onChange={handleExtraInputChange}
              disabled={!isNewExtraClient && !selectedExtraClientId}
            />
            <Input
              placeholder='Email'
              name='email'
              value={extraClientData.email}
              onChange={handleExtraInputChange}
              disabled={!isNewExtraClient && !selectedExtraClientId}
            />
            <Input
              placeholder='Edad'
              name='age'
              value={extraClientData.age}
              onChange={handleExtraInputChange}
              disabled={!isNewExtraClient && !selectedExtraClientId}
            />
            <Input
              placeholder='Dirección'
              name='address'
              value={extraClientData.address}
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
          </Flex>

          <Group mt='md'>
            <Button onClick={handleAddExtraClient}>
              Confirmar cliente extra
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
      {/* </Grid.Col> */}
    </Flex>
  );
};
const MusicInformation = ({
  selectedEvent
}: {
  selectedEvent: EventModel | null;
}) => {
  if (!selectedEvent) return null;

  return (
    <Flex direction='column' gap='8px' mt='8px'>
      {/* Canciones de ingreso */}
      {selectedEvent.welcomeSongs && selectedEvent.welcomeSongs.length > 0 && (
        <Box>
          <Text fw={500} size='sm' mb='xs' c='dimmed'>
            Canciones de ingreso
          </Text>
          {selectedEvent.welcomeSongs.map((song, index) => (
            <EditableData
              key={`welcome-${index}`}
              type='text'
              property={`welcomeSongs[${index}]`}
              title={`Tema ${index + 1}`}
              value={song}
            />
          ))}
        </Box>
      )}

      {/* Canción de rosas */}
      {selectedEvent.walkIn && selectedEvent.walkIn.length > 0 && (
        <Box>
          <Text fw={500} size='sm' mb='xs' c='dimmed'>
            Canción de rosas
          </Text>
          {selectedEvent.walkIn.map((song, index) => (
            <EditableData
              key={`walkin-${index}`}
              type='text'
              property={`walkIn[${index}]`}
              title={`Tema ${index + 1}`}
              value={song}
            />
          ))}
        </Box>
      )}

      {/* Ceremonia Civil */}
      {selectedEvent.ceremoniaCivil && (
        <Box>
          <Text fw={500} size='sm' mb='xs' c='dimmed'>
            Ceremonia Civil
          </Text>
          {selectedEvent.ceremoniaCivil.ingreso && (
            <EditableData
              type='text'
              property='ceremoniaCivil.ingreso'
              title='Ingreso'
              value={selectedEvent.ceremoniaCivil.ingreso}
            />
          )}
          {selectedEvent.ceremoniaCivil.firmas && (
            <EditableData
              type='text'
              property='ceremoniaCivil.firmas'
              title='Firmas'
              value={selectedEvent.ceremoniaCivil.firmas}
            />
          )}
          {selectedEvent.ceremoniaCivil.salida && (
            <EditableData
              type='text'
              property='ceremoniaCivil.salida'
              title='Salida'
              value={selectedEvent.ceremoniaCivil.salida}
            />
          )}
          {selectedEvent.ceremoniaCivil.otros &&
            selectedEvent.ceremoniaCivil.otros.length > 0 && (
              <>
                {selectedEvent.ceremoniaCivil.otros.map((item, index) => (
                  <Box
                    key={`civil-otro-${index}`}
                    style={{
                      borderLeft: '2px solid rgba(255, 255, 255, 0.1)',
                      paddingLeft: '12px',
                      marginTop: '8px'
                    }}
                  >
                    <EditableData
                      type='text'
                      property={`ceremoniaCivil.otros[${index}].titulo`}
                      title='Título'
                      value={item.titulo}
                    />
                    <EditableData
                      type='text'
                      property={`ceremoniaCivil.otros[${index}].cancion`}
                      title='Canción'
                      value={item.cancion}
                    />
                  </Box>
                ))}
              </>
            )}
        </Box>
      )}

      {/* Ceremonia Extra */}
      {selectedEvent.ceremoniaExtra && (
        <Box>
          <Text fw={500} size='sm' mb='xs' c='dimmed'>
            Ceremonia Extra
          </Text>
          {selectedEvent.ceremoniaExtra.ingreso && (
            <EditableData
              type='text'
              property='ceremoniaExtra.ingreso'
              title='Ingreso'
              value={selectedEvent.ceremoniaExtra.ingreso}
            />
          )}
          {selectedEvent.ceremoniaExtra.firmas && (
            <EditableData
              type='text'
              property='ceremoniaExtra.firmas'
              title='Firmas'
              value={selectedEvent.ceremoniaExtra.firmas}
            />
          )}
          {selectedEvent.ceremoniaExtra.salida && (
            <EditableData
              type='text'
              property='ceremoniaExtra.salida'
              title='Salida'
              value={selectedEvent.ceremoniaExtra.salida}
            />
          )}
          {selectedEvent.ceremoniaExtra.otros &&
            selectedEvent.ceremoniaExtra.otros.length > 0 && (
              <>
                {selectedEvent.ceremoniaExtra.otros.map((item, index) => (
                  <Box
                    key={`extra-otro-${index}`}
                    style={{
                      borderLeft: '2px solid rgba(255, 255, 255, 0.1)',
                      paddingLeft: '12px',
                      marginTop: '8px'
                    }}
                  >
                    <EditableData
                      type='text'
                      property={`ceremoniaExtra.otros[${index}].titulo`}
                      title='Título'
                      value={item.titulo}
                    />
                    <EditableData
                      type='text'
                      property={`ceremoniaExtra.otros[${index}].cancion`}
                      title='Canción'
                      value={item.cancion}
                    />
                  </Box>
                ))}
              </>
            )}
        </Box>
      )}

      {/* Vals */}
      {selectedEvent.vals && selectedEvent.vals.length > 0 && (
        <Box>
          <Text fw={500} size='sm' mb='xs' c='dimmed'>
            Vals
          </Text>
          {selectedEvent.vals.map((song, index) => (
            <EditableData
              key={`vals-${index}`}
              type='text'
              property={`vals[${index}]`}
              title={`Vals ${index + 1}`}
              value={song}
            />
          ))}
        </Box>
      )}

      {/* Inicio de fiesta */}
      {selectedEvent.openingPartySong && (
        <Box>
          <Text fw={500} size='sm' mb='xs' c='dimmed'>
            Inicio de fiesta (post cena)
          </Text>
          <EditableData
            type='text'
            property='openingPartySong'
            title='Canción apertura pista'
            value={selectedEvent.openingPartySong}
          />
        </Box>
      )}

      {/* Música para ambientar */}
      {selectedEvent.ambienceMusic &&
        selectedEvent.ambienceMusic.length > 0 && (
          <Box>
            <Text fw={500} size='sm' mb='xs' c='dimmed'>
              Música para ambientar
            </Text>
            {selectedEvent.ambienceMusic.map((category, categoryIndex) => (
              <Box
                key={`ambience-${categoryIndex}`}
                style={{
                  borderLeft: '2px solid rgba(255, 255, 255, 0.1)',
                  paddingLeft: '12px',
                  marginBottom: '12px'
                }}
              >
                <EditableData
                  type='text'
                  property={`ambienceMusic[${categoryIndex}].descripcion`}
                  title='Momento/Descripción'
                  value={category.descripcion}
                />
                {category.generos && category.generos.length > 0 && (
                  <Box mt='xs' ml='md'>
                    <Text size='xs' c='dimmed' mb='4px'>
                      Géneros/Estilos:
                    </Text>
                    <Group gap='xs'>
                      {category.generos.map((genre, genreIndex) => (
                        <Badge
                          key={`genre-${genreIndex}`}
                          size='sm'
                          variant='light'
                        >
                          {genre}
                        </Badge>
                      ))}
                    </Group>
                  </Box>
                )}
              </Box>
            ))}
          </Box>
        )}

      <Divider my='md' />

      {/* Música de preferencia */}
      <Box>
        <Text fw={500} size='sm' mb='xs' c='dimmed'>
          Música de preferencia
        </Text>
        <EditableData
          type='chips'
          value={selectedEvent.music.forbidden}
          property='forbidden'
        />
        <EditableData
          type='chips'
          value={selectedEvent.music.required}
          property='required'
        />
        <EditableData
          type='rate'
          property='genres'
          value={selectedEvent.music.genres}
        />
      </Box>

      <Divider my='md' />

      {/* Spotify Playlists */}
      <Box>
        <Text fw={500} size='sm' mb='xs' c='dimmed'>
          Spotify Playlists
        </Text>
        <SpotifyTable />
      </Box>
    </Flex>
  );
};

const ShowInformation = ({
  selectedEvent,
  handleBandsChange
}: {
  selectedEvent: EventModel | null;
  handleBandsChange: (bands: Band[]) => void;
}) => {
  const [showEditableBand, setShowEditableBand] = useState<boolean>(false);
  const [selectedBand, setSelectedBand] = useState<Band | null>(null);
  const fetcher = (url: string) => fetch(url).then((res) => res.json());
  const { data: allBands, mutate: refetchBands } = useSWR<Band[]>(
    '/api/bands',
    fetcher
  );

  const handleEditBand = (band: Band) => {
    setSelectedBand(band);
    setShowEditableBand(true);
  };

  const handleSaveBand = async (band: Band) => {
    handleBandsChange(
      selectedBand
        ? selectedEvent!.bands.map((b) => (b.bandName === selectedBand.bandName ? band : b))
        : [...(selectedEvent?.bands || []), band]
    );
    await refetchBands();
    setShowEditableBand(false);
    setSelectedBand(null);
  };

  const handleCancelBand = () => {
    setSelectedBand(null);
    setShowEditableBand(false);
  };

  const handleDeleteBand = (indexToRemove: number) => {
    handleBandsChange(selectedEvent!.bands.filter((_, index) => index !== indexToRemove));
  };

  const getFilePreview = (fileUrl: string) => {
    if (!fileUrl) return null;

    const isImage = /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(fileUrl);
    const isPdf = /\.pdf$/i.test(fileUrl);

    return (
      <Box
        style={{
          display: 'inline-flex',
          cursor: 'pointer',
        }}
        onClick={() => window.open(fileUrl, '_blank')}
      >
        <Card
          withBorder
          padding='xs'
          style={{
            width: '80px',
            height: '80px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'transform 0.2s, box-shadow 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.05)';
            e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '';
          }}
        >
          {isImage ? (
            <img
              src={fileUrl}
              alt='Show file'
              style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '4px' }}
            />
          ) : isPdf ? (
            <svg width='40' height='40' viewBox='0 0 24 24' fill='#FF0000'>
              <path d='M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M15.5,16.5C15.5,17.61 14.61,18.5 13.5,18.5H11V20H9.5V13H13.5A2,2 0 0,1 15.5,15V16.5M13.5,16.5V15H11V16.5H13.5Z' />
            </svg>
          ) : (
            <svg width='40' height='40' viewBox='0 0 24 24' fill='#888888'>
              <path d='M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z' />
            </svg>
          )}
        </Card>
      </Box>
    );
  };

  return (
    <Flex direction='column' gap='md' mt='8px'>
      {/* Título principal con botón de agregar */}
      <Flex justify='space-between' align='center' mb='md'>
        <Title order={3}>Shows Agregados</Title>
        {!showEditableBand && (
          <Button
            leftSection={<IconPlus size={16} />}
            onClick={() => {
              setSelectedBand(null);
              setShowEditableBand(true);
            }}
            color='green'
            size='sm'
          >
            Agregar Show
          </Button>
        )}
      </Flex>

      {/* Formulario editable de band */}
      {showEditableBand && (
        <Card withBorder padding='lg' mb='md'>
          <EditableBand
            band={selectedBand || undefined}
            allBands={allBands || []}
            onSave={handleSaveBand}
            onCancel={handleCancelBand}
          />
        </Card>
      )}

      {/* Lista de Shows como Accordions */}
      {selectedEvent?.bands && selectedEvent.bands.length > 0 ? (
        <Accordion>
          {selectedEvent.bands.map((band, index) => (
            <Accordion.Item key={index} value={`band-${index}`}>
              <Accordion.Control>
                <Flex justify='space-between' align='center' pr='md'>
                  <Text size='lg' fw={700}>
                    Show: {band.bandName}
                  </Text>
                  <Group gap='xs' onClick={(e) => e.stopPropagation()}>
                    <Button
                      size='xs'
                      variant='light'
                      color='blue'
                      onClick={() => handleEditBand(band)}
                    >
                      Editar
                    </Button>
                    <Button
                      size='xs'
                      variant='light'
                      color='red'
                      onClick={() => handleDeleteBand(index)}
                    >
                      Eliminar
                    </Button>
                  </Group>
                </Flex>
              </Accordion.Control>
              <Accordion.Panel>
                <Flex direction='column' gap='md'>
                  {/* Sección de Contactos */}
                  {band.contacts && band.contacts.length > 0 && (
                    <>
                      <Text size='lg' fw={700} mb='xs'>
                        Contacto
                      </Text>
                      {band.contacts.map((contact, contactIndex) => (
                        <Box key={contactIndex} mb='xs'>
                          <Text size='sm' c='white'>
                            <Text component='span' fw={600}>Contacto:</Text> {contact.name} - <Text component='span' fw={600}>Rol:</Text> {contact.rol} - <Text component='span' fw={600}>Tel:</Text> {contact.phone}
                          </Text>
                        </Box>
                      ))}
                    </>
                  )}

                  {/* Sección de Otros Datos */}
                  {(band.bandInfo || band.showTime || band.testTime || band.fileUrl) && (
                    <>
                      <Divider my='sm' />
                      <Text size='lg' fw={700} mb='xs'>
                        Otros datos
                      </Text>

                      {band.bandInfo && (
                        <EditableData
                          type='textarea'
                          property={`bands[${index}].bandInfo`}
                          title='Información adicional'
                          value={band.bandInfo}
                        />
                      )}

                      {band.showTime && (
                        <EditableData
                          type='text'
                          property={`bands[${index}].showTime`}
                          title='Hora de presentación'
                          value={band.showTime}
                        />
                      )}

                      {band.testTime && (
                        <EditableData
                          type='text'
                          property={`bands[${index}].testTime`}
                          title='Hora de prueba de sonido'
                          value={band.testTime}
                        />
                      )}

                      {band.fileUrls && band.fileUrls.length > 0 && (
                        <Box py='4px' mb='4px'>
                          <Text fw={600} size='sm' c='white' mb='xs'>Archivos:</Text>
                          <Flex gap='md' wrap='wrap'>
                            {band.fileUrls.map((fileUrl, idx) => (
                              <div key={idx}>
                                {getFilePreview(fileUrl)}
                              </div>
                            ))}
                          </Flex>
                        </Box>
                      )}
                    </>
                  )}
                </Flex>
              </Accordion.Panel>
            </Accordion.Item>
          ))}
        </Accordion>
      ) : (
        !showEditableBand && (
          <Text c='dimmed' fs='italic'>
            No hay shows agregados
          </Text>
        )
      )}
    </Flex>
  );
};

const EquipmentInformation = () => {
  return <EquipmentTable />;
};
const TimingInformation = ({
  selectedEvent
}: {
  selectedEvent: EventModel | null;
}) => {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingItem, setEditingItem] = useState<{
    time: string;
    title: string;
    details: string;
  } | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [newItem, setNewItem] = useState({ time: '', title: '', details: '' });
  const { setSelectedEvent } = useDeganoCtx();
  const setLoadingCursor = useLoadingCursor();
  const notify = useNotification();

  const updateEventData = async (updates: Partial<EventModel>) => {
    if (!selectedEvent) return;
    setLoadingCursor(true);
    notify({ loading: true });
    const timeStamp = new Date().toISOString();
    try {
      const updatedEvent = { ...selectedEvent, ...updates };
      const response = await fetch(`/api/updateEvent?id=${timeStamp}`, {
        method: 'PUT',
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatedEvent)
      });
      await response.json();
      setSelectedEvent(updatedEvent);
      notify();
    } catch (error) {
      notify({ type: 'defaultError' });
      console.error('Error updating event:', error);
    } finally {
      setLoadingCursor(false);
    }
  };

  const handleAddTiming = async () => {
    if (!selectedEvent) return;
    const updatedTiming = [...(selectedEvent.timing || []), newItem];
    await updateEventData({ timing: updatedTiming });
    setNewItem({ time: '', title: '', details: '' });
    setIsAdding(false);
  };

  const handleEditTiming = (index: number) => {
    if (!selectedEvent?.timing) return;
    setEditingIndex(index);
    setEditingItem({ ...selectedEvent.timing[index] });
  };

  const handleSaveEdit = async () => {
    if (!selectedEvent || editingIndex === null || !editingItem) return;
    const updatedTiming = selectedEvent.timing?.map((item, i) =>
      i === editingIndex ? editingItem : item
    );
    await updateEventData({ timing: updatedTiming });
    setEditingIndex(null);
    setEditingItem(null);
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditingItem(null);
  };

  const handleDeleteTiming = async (index: number) => {
    if (!selectedEvent) return;
    const updatedTiming = selectedEvent.timing?.filter((_, i) => i !== index);
    await updateEventData({ timing: updatedTiming });
  };

  if (!selectedEvent) return null;

  return (
    <Flex direction='column' gap='md' mt='8px'>
      {/* Título con botón de agregar */}
      <Flex justify='space-between' align='center' mb='md'>
        <Title order={3}>Cronograma del Evento</Title>
        {!isAdding && (
          <Button
            leftSection={<IconPlus size={16} />}
            variant='outline'
            onClick={() => setIsAdding(true)}
          >
            Agregar Evento al Cronograma
          </Button>
        )}
      </Flex>

      {/* Formulario de agregar nuevo timing */}
      {isAdding && (
        <Card withBorder padding='md' mb='md'>
          <Text fw={500} mb='sm'>Nuevo Evento al Cronograma</Text>
          <Flex gap='sm' mb='sm' align='flex-end'>
            <TimePicker
              label='Hora'
              value={newItem.time}
              onChange={(value) => setNewItem({ ...newItem, time: value })}
              style={{ flex: 1 }}
            />
            <Box style={{ flex: 2 }}>
              <Text size='sm' fw={500} mb='4px'>Título</Text>
              <Input
                placeholder='Título del evento'
                value={newItem.title}
                onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
              />
            </Box>
          </Flex>
          <Textarea
            placeholder='Detalles adicionales'
            value={newItem.details}
            onChange={(e) => setNewItem({ ...newItem, details: e.target.value })}
            minRows={2}
            mb='sm'
          />
          <Group gap='xs'>
            <Button onClick={handleAddTiming} color='green' size='xs'>
              Guardar
            </Button>
            <Button
              onClick={() => {
                setIsAdding(false);
                setNewItem({ time: '', title: '', details: '' });
              }}
              variant='light'
              color='gray'
              size='xs'
            >
              Cancelar
            </Button>
          </Group>
        </Card>
      )}

      {/* Lista de timing */}
      {selectedEvent.timing && selectedEvent.timing.length > 0 ? (
        <Flex direction='column' gap='xs'>
          {selectedEvent.timing.map((item, index) => (
            <Card key={index} withBorder padding='sm'>
              {editingIndex === index ? (
                // Modo edición
                <Box>
                  <Text fw={500} mb='sm' c='dimmed'>#{index + 1}</Text>
                  <Flex gap='sm' mb='sm' align='flex-end'>
                    <TimePicker
                      label='Hora'
                      value={editingItem?.time || ''}
                      onChange={(value) =>
                        setEditingItem({ ...editingItem!, time: value })
                      }
                      style={{ flex: 1 }}
                    />
                    <Box style={{ flex: 2 }}>
                      <Text size='sm' fw={500} mb='4px'>Título</Text>
                      <Input
                        placeholder='Título del evento'
                        value={editingItem?.title || ''}
                        onChange={(e) =>
                          setEditingItem({ ...editingItem!, title: e.target.value })
                        }
                      />
                    </Box>
                  </Flex>
                  <Textarea
                    placeholder='Detalles adicionales'
                    value={editingItem?.details || ''}
                    onChange={(e) =>
                      setEditingItem({ ...editingItem!, details: e.target.value })
                    }
                    minRows={2}
                    mb='sm'
                  />
                  <Group gap='xs'>
                    <Button onClick={handleSaveEdit} color='green' size='xs'>
                      Guardar
                    </Button>
                    <Button
                      onClick={handleCancelEdit}
                      variant='light'
                      color='gray'
                      size='xs'
                    >
                      Cancelar
                    </Button>
                  </Group>
                </Box>
              ) : (
                // Modo visualización
                <Flex justify='space-between' align='center' gap='md'>
                  <Flex gap='md' align='center' style={{ flex: 1 }}>
                    <Text fw={600} c='dimmed' style={{ minWidth: '30px' }}>
                      #{index + 1}
                    </Text>
                    <Text fw={600} style={{ minWidth: '60px' }}>
                      {item.time}hs
                    </Text>
                    <Text fw={500} style={{ flex: 1 }}>
                      {item.title}
                    </Text>
                    {item.details && (
                      <Text size='sm' c='dimmed' style={{ flex: 2 }}>
                        {item.details}
                      </Text>
                    )}
                  </Flex>
                  <Group gap='xs'>
                    <Button
                      size='xs'
                      variant='light'
                      color='blue'
                      onClick={() => handleEditTiming(index)}
                    >
                      Editar
                    </Button>
                    <Button
                      size='xs'
                      variant='light'
                      color='red'
                      onClick={() => handleDeleteTiming(index)}
                    >
                      Eliminar
                    </Button>
                  </Group>
                </Flex>
              )}
            </Card>
          ))}
        </Flex>
      ) : (
        !isAdding && (
          <Text c='dimmed' fs='italic'>
            No hay cronograma definido
          </Text>
        )
      )}
    </Flex>
  );
};
const MoreInfoInformation = ({
  selectedEvent
}: {
  selectedEvent: EventModel | null;
}) => {
  if (!selectedEvent) return null;
  return (
    <EditableData
      type='textarea'
      property='moreData'
      value={selectedEvent.moreData}
    />
  );
};

const EventPage = () => {
  const { setSelectedEvent, selectedEvent, loading, setFolderName } =
    useDeganoCtx();
  const { user } = useUser();

  const isAdmin = user?.role === 'admin';

  const { id } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const setLoadingCursor = useLoadingCursor();
  const [dateString, setDateString] = useState('');
  const [showPrintableComponent, setShowPrintableComponent] = useState(false);
  const [showTabsVersion, setShowTabsVersion] = useState(true);
  const [activeTab, setActiveTab] = useState<string | null>('main');
  const notify = useNotification();

  // Obtener la ruta de origen si existe
  const fromPath = searchParams.get('from');

  // Fetch event directly from API instead of using cached allEvents
  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const response = await fetch(`/api/getEvent?id=${id}`, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
            Pragma: 'no-cache'
          }
        });
        const data = await response.json();
        if (data.event) {
          setSelectedEvent(data.event);
          setFolderName(
            `${new Date(data.event.date).toLocaleDateString('es-ES', {
              day: '2-digit',
              month: '2-digit',
              year: '2-digit'
            })} - ${data.event.type} - ${data.event.lugar}`
          );
        }
      } catch (error) {
        console.error('Error fetching event:', error);
      }
    };

    if (id) {
      fetchEvent();
    }
  }, [id]);

  useEffect(() => {
    if (selectedEvent?.date) {
      const date = new Date(selectedEvent.date).toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit'
      });
      setDateString(date);
    }
  }, [selectedEvent?.date]);

  useEffect(() => {
    setLoadingCursor(false);
  }, []);

  const handleBandsChange = async (bands: Band[]) => {
    setLoadingCursor(true);
    notify({ loading: true });
    const editedEvent = {
      ...selectedEvent,
      bands
    };
    try {
      const response = await fetch('/api/updateBands', {
        method: 'PUT',
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editedEvent)
      });
      const { event } = await response.json();
      setSelectedEvent(event);
      notify();
    } catch (err) {
      notify({ type: 'defaultError' });
      console.log(err);
    } finally {
      setLoadingCursor(false);
    }
  };

  const tabContent = {
    main: (
      <PDFActions
        sectionKey='main'
        eventTitle={
          dateString
            ? `${dateString} - ${selectedEvent?.type} - ${selectedEvent?.lugar}`
            : undefined
        }
      >
        <MainInformation selectedEvent={selectedEvent} />
      </PDFActions>
    ),
    bands: (
      <PDFActions
        sectionKey='bands'
        eventTitle={
          dateString
            ? `${dateString} - ${selectedEvent?.type} - ${selectedEvent?.lugar}`
            : undefined
        }
      >
        <ShowInformation
          selectedEvent={selectedEvent}
          handleBandsChange={handleBandsChange}
        />
      </PDFActions>
    ),
    music: (
      <PDFActions
        sectionKey='music'
        eventTitle={
          dateString
            ? `${dateString} - ${selectedEvent?.type} - ${selectedEvent?.lugar}`
            : undefined
        }
      >
        <MusicInformation selectedEvent={selectedEvent} />
      </PDFActions>
    ),
    timing: (
      <PDFActions sectionKey='timing'>
        <TimingInformation selectedEvent={selectedEvent} />
      </PDFActions>
    ),
    moreInfo: (
      <PDFActions
        sectionKey='moreInfo'
        eventTitle={
          dateString
            ? `${dateString} - ${selectedEvent?.type} - ${selectedEvent?.lugar}`
            : undefined
        }
      >
        <MoreInfoInformation selectedEvent={selectedEvent} />
      </PDFActions>
    ),
    equipment: (
      <PDFActions
        sectionKey='equipment'
        eventTitle={
          dateString
            ? `${dateString} - ${selectedEvent?.type} - ${selectedEvent?.lugar}`
            : undefined
        }
      >
        <EquipmentInformation />
      </PDFActions>
    ),
    files: <FilesHandlerComponent />,
    payments: (
      <PDFActions
        sectionKey='payments'
        eventTitle={
          dateString
            ? `${dateString} - ${selectedEvent?.type} - ${selectedEvent?.lugar}`
            : undefined
        }
      >
        <EditablePayments />
      </PDFActions>
    )
  };

  const TabsVersion = () => {
    return (
      <>
        <EventTabs />
        <div>{tabContent[activeTab as keyof typeof tabContent]}</div>
      </>
    );
  };

  const AllAccordions = () => {
    if (!selectedEvent) return null;
    return (
      <>
        <Flex direction='column' gap='8px'>
          <AccordionSet value='Información Principal'>
            <Grid gutter='xl'>
              <Grid.Col span={5.5}>
                <EditableData
                  type='text'
                  property='phoneNumber'
                  title='Teléfono'
                  value={selectedEvent.phoneNumber}
                />
                <EditableData
                  type='text'
                  property='type'
                  title='Tipo de evento'
                  value={selectedEvent.type}
                />
                <EditableData
                  type='date'
                  property='date'
                  title='Fecha'
                  value={new Date(selectedEvent.date)}
                />
                {selectedEvent.endDate ? (
                  <EditableData
                    type='date'
                    property='endDate'
                    title='Fecha Finalizacion'
                    value={new Date(selectedEvent.endDate)}
                  />
                ) : (
                  <></>
                )}
                <EditableData
                  type='text'
                  property='lugar'
                  title='Lugar'
                  value={selectedEvent.lugar}
                />
                <EditableData
                  type='text'
                  property='eventAddress'
                  title='Dirección'
                  value={selectedEvent.eventAddress}
                />
                <EditableData
                  type='text'
                  property='eventCity'
                  title='Localidad'
                  value={selectedEvent.eventCity}
                />
                <EditableData
                  type='text'
                  property='guests'
                  title='Cantidad de invitados'
                  value={selectedEvent.guests}
                />
              </Grid.Col>
              <Grid.Col
                span='auto'
                style={{ width: '2px', minWidth: '2px', flexGrow: 0 }}
              >
                <Divider orientation='vertical' />
              </Grid.Col>
              <Grid.Col span={5.5}>
                <EditableData
                  type='text'
                  property='age'
                  title='Edad'
                  value={selectedEvent.age}
                />
                {selectedEvent.email && (
                  <EditableData
                    type='text'
                    property='email'
                    title='Email'
                    value={selectedEvent.email}
                  />
                )}
                <EditableData
                  type='text'
                  property='guests'
                  title='Invitados'
                  value={selectedEvent.guests}
                />
              </Grid.Col>
            </Grid>
          </AccordionSet>
          <AccordionSet value='Show'>
            <BandList
              bands={selectedEvent?.bands || []}
              onBandsChange={handleBandsChange}
              editing={true}
            />
          </AccordionSet>
          <AccordionSet value='Música'>
            <AccordionSet value='Prohibidos'>
              <EditableData
                type='chips'
                value={selectedEvent.music.forbidden}
                property='forbidden'
              />
            </AccordionSet>
            <AccordionSet value='Requeridos'>
              <EditableData
                type='chips'
                value={selectedEvent.music.required}
                property='required'
              />
            </AccordionSet>
            <AccordionSet value='Géneros'>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px'
                }}
              >
                <EditableData
                  type='rate'
                  property='genres'
                  value={selectedEvent.music.genres}
                />
              </div>
            </AccordionSet>
            <AccordionSet value='Playlist'>
              <SpotifyTable />
            </AccordionSet>
          </AccordionSet>
          <AccordionSet value='Más Información'>
            <EditableData
              type='textarea'
              property='moreData'
              value={selectedEvent.moreData}
            />
          </AccordionSet>
          {/* <AccordionSet value='Equipos'>
            <EquipmentTable />
          </AccordionSet> */}
          <AccordionSet value='Archivos'>
            <FilesHandlerComponent />
          </AccordionSet>
          {isAdmin && (
            <AccordionSet value='Historial de pagos'>
              <EditablePayments />
            </AccordionSet>
          )}
        </Flex>
      </>
    );
  };

  const EventTabs = () => {
    return (
      <Tabs
        value={activeTab}
        onChange={(value: string | null) => setActiveTab(value)}
      >
        <Tabs.List>
          <Tabs.Tab value='main'>Información Principal</Tabs.Tab>
          <Tabs.Tab value='bands'>Show</Tabs.Tab>
          <Tabs.Tab value='music'>Música</Tabs.Tab>
          <Tabs.Tab value='timing'>Timing</Tabs.Tab>
          <Tabs.Tab value='moreInfo'>Más Información</Tabs.Tab>
          <Tabs.Tab value='equipment'>Equipos</Tabs.Tab>
          <Tabs.Tab value='files'>Archivos</Tabs.Tab>
          {isAdmin && <Tabs.Tab value='payments'>Presupuesto</Tabs.Tab>}
        </Tabs.List>
      </Tabs>
    );
  };

  return selectedEvent ? (
    <Container size='xl'>
      {loading ? (
        <Loader />
      ) : (
        <>
          {showPrintableComponent ? (
            <PrintableEvent />
          ) : (
            <Box>
              {/* Botón de volver si viene desde el calendario */}
              {fromPath && fromPath.includes('/calendar') && (
                <Button
                  variant='subtle'
                  leftSection={<IconArrowLeft size={16} />}
                  onClick={() => router.push(fromPath)}
                  mb='md'
                  size='sm'
                >
                  Volver al calendario
                </Button>
              )}
              <Title mb='16px'>
                {`${dateString} - ${selectedEvent.type} -  ${selectedEvent.lugar}`}
              </Title>
              {showTabsVersion ? <TabsVersion /> : <AllAccordions />}
            </Box>
          )}
        </>
      )}
    </Container>
  ) : null;
};

export default withPageAuthRequired(EventPage);

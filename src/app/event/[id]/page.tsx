'use client';
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
  Group
} from '@mantine/core';
import { IconUserPlus, IconUserCheck, IconSearch } from '@tabler/icons-react';
import { useParams } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import { useUser } from '@auth0/nextjs-auth0/client';
import FilesHandlerComponent from '@/components/FilesHandlerComponent/FilesHandlerComponent';
import SpotifyTable from '@/components/SpotifyTable/SpotifyTable';
import BandList from '@/components/BandManager/BandList';
import useNotification from '@/hooks/useNotification';

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
  const [selectedExtraClientId, setSelectedExtraClientId] = useState<string | null>(null);
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

  useEffect(() => {
    fetchClients();
  }, []);

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
      const updatedExtraClients = [...selectedEvent.extraClients, extraClientData];
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
        !selectedEvent?.extraClients.some((extra) => extra._id && extra._id === client._id)
    )
    .filter((client) => client.fullName !== selectedEvent?.fullName);

  const clientOptions = filteredClients.map((client) => ({
    value: client._id,
    label: `${client.fullName} - ${client.phoneNumber}`
  }));

  if (!selectedEvent) return null;
  return (
    <Flex direction='column' gap='8px' mt='8px'>
      {/* <Grid.Col span={5.5}> */}
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
          property='type'
          title='Tipo de evento'
          value={selectedEvent.type}
        />
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
        <EditableData
          type='text'
          property='guests'
          title='Cantidad de invitados'
          value={selectedEvent.guests}
        />
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

        {/* <EditableData
          type='text'
          property='eventAddress'
          title='Dirección'
          value={selectedEvent.eventAddress}
        /> */}
        <EditableData
          type='text'
          property='age'
          title='Edad'
          value={selectedEvent.age}
        />
      {/* </Grid.Col>
      <Grid.Col
        span='auto'
        style={{ width: '2px', minWidth: '2px', flexGrow: 0 }}
      >*/}
        {/* <Divider orientation='vertical' />
      </Grid.Col>
      <Grid.Col span={5.5}> */}
        {selectedEvent.extraClients.length > 0 &&
          selectedEvent.extraClients.map((client, index) => {
            return (
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
              </React.Fragment>
            );
          })}

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
      {selectedEvent.ambienceMusic && selectedEvent.ambienceMusic.length > 0 && (
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
                      <Badge key={`genre-${genreIndex}`} size='sm' variant='light'>
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

const EquipmentInformation = () => {
  return <EquipmentTable />;
};
const TimingInformation = ({
  selectedEvent
}: {
  selectedEvent: EventModel | null;
}) => {
  if (!selectedEvent) return null;
  return (
    <Flex direction='column' gap='8px' mt='8px'>
      {selectedEvent.timing && selectedEvent.timing.length > 0 ? (
        selectedEvent.timing.map((item, index, array) => (
          <Box
            key={index}
            style={{
              borderBottom: index < array.length - 1 ? '1px solid rgba(255, 255, 255, 0.1)' : 'none',
              paddingBottom: '8px',
              marginBottom: '4px'
            }}
          >
            <Text fw={500} size='xs' c='dimmed' mb='4px'>
              #{index + 1}
            </Text>
            <Flex gap='sm' mb='4px'>
              <EditableData
                type='text'
                property={`timing[${index}].time`}
                title='Hora'
                value={item.time + 'hs' || ''}
                style={{ flexGrow: 1 }}
              />
              <EditableData
                type='text'
                property={`timing[${index}].title`}
                title='Título'
                value={item.title || ''}
                style={{ flexGrow: 1 }}
              />
            </Flex>
            <EditableData
              type='textarea'
              property={`timing[${index}].details`}
              title='Detalles'
              value={item.details || ''}
            />
          </Box>
        ))
      ) : (
        <Text c='dimmed' fs='italic'>
          No hay cronograma definido
        </Text>
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
  const { allEvents, setSelectedEvent, selectedEvent, loading, setFolderName } =
    useDeganoCtx();
  const { user } = useUser();

  const isAdmin = user?.role === 'admin';

  const { id } = useParams();
  const setLoadingCursor = useLoadingCursor();
  const [dateString, setDateString] = useState('');
  const [showPrintableComponent, setShowPrintableComponent] = useState(false);
  const [showTabsVersion, setShowTabsVersion] = useState(true);
  const [activeTab, setActiveTab] = useState<string | null>('main');
  const notify = useNotification();

  useEffect(() => {
    if (allEvents.length) {
      const selectedEvent: EventModel = allEvents.find(
        (event) => event._id === id
      )!;
      setSelectedEvent(selectedEvent);
      setFolderName(
        `${new Date(selectedEvent.date).toLocaleDateString('es-ES', {
          day: '2-digit',
          month: '2-digit',
          year: '2-digit'
        })} - ${selectedEvent.type} - ${selectedEvent.lugar}`
      );
    }
  }, [allEvents, id]);

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
        <BandList
          bands={selectedEvent?.bands || []}
          onBandsChange={handleBandsChange}
          editing={true}
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
        {tabContent[activeTab as keyof typeof tabContent]}
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
          <AccordionSet value='Banda en vivo'>
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

  const printEventDetails = () => {
    setShowPrintableComponent((prev) => !prev);
  };

  const EventTabs = () => {
    return (
      <Tabs
        value={activeTab}
        onChange={(value: string | null) => setActiveTab(value)}
      >
        <Tabs.List>
          <Tabs.Tab value='main'>Información Principal</Tabs.Tab>
          <Tabs.Tab value='bands'>Banda en vivo</Tabs.Tab>
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
              <Title mb='16px'>
                {`${dateString} - ${selectedEvent.type} -  ${selectedEvent.lugar}`}
              </Title>
              {showTabsVersion ? <TabsVersion /> : <AllAccordions />}
            </Box>
          )}
        </>
      )}
      <Box mt='24px'>
        <Button onClick={printEventDetails}>
          {showPrintableComponent ? 'Volver' : 'Imprimir'}
        </Button>
      </Box>
    </Container>
  ) : null;
};

export default withPageAuthRequired(EventPage);

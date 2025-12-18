import {
  Box,
  Button,
  Chip,
  Flex,
  Input,
  rem,
  Text,
  Loader,
  Alert,
  Group,
  UnstyledButton,
  Stack,
  Accordion,
  ActionIcon,
  Card,
  TextInput,
  Divider
} from '@mantine/core';
import { useEffect, useState } from 'react';
import { EventModel, CeremonyMusic, AmbienceMusicItem } from '@/context/types';
import { IconX, IconAlertCircle, IconPlus, IconTrash } from '@tabler/icons-react';
import styles from './MusicForm.module.css';
import { EVENT_TABS } from '@/context/config';
import { useGenres, transformGenresForMusic } from '@/hooks/useGenres';

type GenreType = {
  genre: string;
  value: number;
};

type SpotifyLink = {
  label: string;
  url: string;
};

const MusicForm = ({
  event,
  onNextTab,
  onBackTab,
  updateEvent
}: {
  event: EventModel;
  onNextTab: Function;
  onBackTab: Function;
  updateEvent?: Function;
}) => {
  const {
    genres: dbGenres,
    loading: genresLoading,
    error: genresError
  } = useGenres();

  const [musicData, setMusicData] = useState(() => {
    const normalizedEvent = {
      ...event,
      welcomeSongs: Array.isArray(event.welcomeSongs) ? event.welcomeSongs : [],
      walkIn: Array.isArray(event.walkIn) ? event.walkIn : [],
      vals: Array.isArray(event.vals) ? event.vals : [],
      openingPartySong: event.openingPartySong || '',
      ceremoniaCivil: event.ceremoniaCivil || {
        ingreso: '',
        firmas: '',
        salida: '',
        otros: []
      },
      ceremoniaExtra: event.ceremoniaExtra || {
        ingreso: '',
        firmas: '',
        salida: '',
        otros: []
      },
      ambienceMusic: Array.isArray(event.ambienceMusic) ? event.ambienceMusic : []
    };
    return normalizedEvent;
  });

  const [spotifyLinks, setSpotifyLinks] = useState<SpotifyLink[]>([]);
  const [spotifyLinkInputValue, setSpotifyLinkInputValue] = useState('');
  const [spotifyLabelInputValue, setSpotifyLabelInputValue] = useState('');

  // Sincronizar estado local con el prop event cuando el usuario navega
  useEffect(() => {
    if (event) {
      const normalizedEvent = {
        ...event,
        welcomeSongs: Array.isArray(event.welcomeSongs) ? event.welcomeSongs : [],
        walkIn: Array.isArray(event.walkIn) ? event.walkIn : [],
        vals: Array.isArray(event.vals) ? event.vals : [],
        openingPartySong: event.openingPartySong || '',
        ceremoniaCivil: event.ceremoniaCivil || {
          ingreso: '',
          firmas: '',
          salida: '',
          otros: []
        },
        ceremoniaExtra: event.ceremoniaExtra || {
          ingreso: '',
          firmas: '',
          salida: '',
          otros: []
        },
        ambienceMusic: Array.isArray(event.ambienceMusic) ? event.ambienceMusic : []
      };
      setMusicData(normalizedEvent);

      if (event.playlist && Array.isArray(event.playlist)) {
        setSpotifyLinks(event.playlist);
      }
    }
  }, [event]);

  // Update musicData with database genres when they load
  useEffect(() => {
    if (
      dbGenres.length > 0 &&
      (!event.music.genres || event.music.genres.length === 0)
    ) {
      const transformedGenres = transformGenresForMusic(dbGenres);
      setMusicData((prevData) => ({
        ...prevData,
        music: {
          ...prevData.music,
          genres: transformedGenres
        }
      }));
    }
  }, [dbGenres, event.music.genres]);

  const handleForbidden = (e: any) => {
    const target = e.target as HTMLInputElement;
    const value = target.value;
    if (e.key === 'Enter') {
      setMusicData((prevData) => {
        if (!prevData) return null;
        const updatedMusicData = {
          ...prevData,
          music: {
            ...prevData.music,
            forbidden: [...(prevData.music?.forbidden || []), value]
          }
        };
        return updatedMusicData as any;
      });
      target.value = '';
    }
  };

  const handleRequired = (e: any) => {
    const target = e.target as HTMLInputElement;
    const value = target.value;
    if (e.key === 'Enter') {
      setMusicData((prevData) => {
        if (!prevData) return null;
        const updatedMusicData = {
          ...prevData,
          music: {
            ...prevData.music,
            required: [...(prevData.music?.required || []), value]
          }
        };
        return updatedMusicData as any;
      });
      target.value = '';
    }
  };

  const rateGenre = (value: number, index: number) => {
    setMusicData((prevData) => {
      if (!prevData) return prevData;
      const updatedGenres = prevData.music.genres.map((genre, idx) =>
        idx === index ? { ...genre, value: value } : genre
      );
      const updatedMusicData = {
        ...prevData,
        music: {
          ...prevData.music,
          genres: updatedGenres
        }
      };
      return updatedMusicData;
    });
  };

  const deleteSongForbidden = (arg: any) => {
    const newList = musicData?.music.forbidden.filter((song) => song !== arg);
    setMusicData((prevData: any) => {
      if (!prevData) return null;
      return {
        ...prevData,
        music: {
          ...prevData.music,
          forbidden: newList
        },
        allDay: prevData.allDay ?? false
      };
    });
  };

  const deleteSongRequired = (arg: any) => {
    const newList = musicData?.music.required.filter((song) => song !== arg);
    setMusicData((prevData: any) => {
      if (!prevData) return null;
      return {
        ...prevData,
        music: {
          ...prevData.music,
          required: newList
        },
        allDay: prevData.allDay ?? false
      };
    });
  };

  const next = () => {
    const dataToSave = { ...musicData, playlist: spotifyLinks };
    if (updateEvent) {
      updateEvent(dataToSave);
    }
    onNextTab(EVENT_TABS.TIMING, dataToSave);
  };

  const back = () => {
    const dataToSave = { ...musicData, playlist: spotifyLinks };
    if (updateEvent) {
      updateEvent(dataToSave);
    }
    onBackTab(EVENT_TABS.SHOW, dataToSave);
  };

  const handleSpotifyLinks = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      addSpotifyLinkButton();
    }
  };

  const addSpotifyLinkButton = () => {
    if (spotifyLinkInputValue) {
      setSpotifyLinks((prev) => [
        ...prev,
        { label: spotifyLabelInputValue, url: spotifyLinkInputValue }
      ]);
      setSpotifyLinkInputValue('');
      setSpotifyLabelInputValue('');
    }
  };

  // Canciones de ingreso handlers
  const addWelcomeSong = () => {
    setMusicData((prevData) => ({
      ...prevData,
      welcomeSongs: [...(prevData.welcomeSongs || []), '']
    }));
  };

  const updateWelcomeSong = (index: number, value: string) => {
    setMusicData((prevData) => ({
      ...prevData,
      welcomeSongs: (prevData.welcomeSongs || []).map((song, i) =>
        i === index ? value : song
      )
    }));
  };

  const deleteWelcomeSong = (index: number) => {
    setMusicData((prevData) => ({
      ...prevData,
      welcomeSongs: (prevData.welcomeSongs || []).filter((_, i) => i !== index)
    }));
  };

  // Canción de rosas handlers
  const addWalkIn = () => {
    setMusicData((prevData) => ({
      ...prevData,
      walkIn: [...(prevData.walkIn || []), '']
    }));
  };

  const updateWalkIn = (index: number, value: string) => {
    setMusicData((prevData) => ({
      ...prevData,
      walkIn: (prevData.walkIn || []).map((song, i) => (i === index ? value : song))
    }));
  };

  const deleteWalkIn = (index: number) => {
    setMusicData((prevData) => ({
      ...prevData,
      walkIn: (prevData.walkIn || []).filter((_, i) => i !== index)
    }));
  };

  // Vals handlers
  const addVals = () => {
    setMusicData((prevData) => ({
      ...prevData,
      vals: [...(prevData.vals || []), '']
    }));
  };

  const updateVals = (index: number, value: string) => {
    setMusicData((prevData) => ({
      ...prevData,
      vals: (prevData.vals || []).map((song, i) => (i === index ? value : song))
    }));
  };

  const deleteVals = (index: number) => {
    setMusicData((prevData) => ({
      ...prevData,
      vals: (prevData.vals || []).filter((_, i) => i !== index)
    }));
  };

  // Ceremonia handlers
  const updateCeremony = (
    type: 'ceremoniaCivil' | 'ceremoniaExtra',
    field: 'ingreso' | 'firmas' | 'salida',
    value: string
  ) => {
    setMusicData((prevData) => ({
      ...prevData,
      [type]: {
        ...prevData[type],
        [field]: value
      }
    }));
  };

  const addCeremonyOtro = (type: 'ceremoniaCivil' | 'ceremoniaExtra') => {
    setMusicData((prevData) => ({
      ...prevData,
      [type]: {
        ...prevData[type],
        otros: [...(prevData[type]?.otros || []), { titulo: '', cancion: '' }]
      }
    }));
  };

  const updateCeremonyOtro = (
    type: 'ceremoniaCivil' | 'ceremoniaExtra',
    index: number,
    field: 'titulo' | 'cancion',
    value: string
  ) => {
    setMusicData((prevData) => ({
      ...prevData,
      [type]: {
        ...prevData[type],
        otros: (prevData[type]?.otros || []).map((item, i) =>
          i === index ? { ...item, [field]: value } : item
        )
      }
    }));
  };

  const deleteCeremonyOtro = (
    type: 'ceremoniaCivil' | 'ceremoniaExtra',
    index: number
  ) => {
    setMusicData((prevData) => ({
      ...prevData,
      [type]: {
        ...prevData[type],
        otros: (prevData[type]?.otros || []).filter((_, i) => i !== index)
      }
    }));
  };

  // Música para ambientar handlers
  const addAmbienceCategory = () => {
    setMusicData((prevData) => ({
      ...prevData,
      ambienceMusic: [
        ...(prevData.ambienceMusic || []),
        { descripcion: '', generos: [] }
      ]
    }));
  };

  const updateAmbienceDescription = (index: number, value: string) => {
    setMusicData((prevData) => ({
      ...prevData,
      ambienceMusic: (prevData.ambienceMusic || []).map((item, i) =>
        i === index ? { ...item, descripcion: value } : item
      )
    }));
  };

  const addAmbienceGenre = (index: number, genre: string) => {
    if (!genre.trim()) return;
    setMusicData((prevData) => ({
      ...prevData,
      ambienceMusic: (prevData.ambienceMusic || []).map((item, i) =>
        i === index ? { ...item, generos: [...item.generos, genre.trim()] } : item
      )
    }));
  };

  const deleteAmbienceGenre = (categoryIndex: number, genreIndex: number) => {
    setMusicData((prevData) => ({
      ...prevData,
      ambienceMusic: (prevData.ambienceMusic || []).map((item, i) =>
        i === categoryIndex
          ? {
              ...item,
              generos: item.generos.filter((_, j) => j !== genreIndex)
            }
          : item
      )
    }));
  };

  const deleteAmbienceCategory = (index: number) => {
    setMusicData((prevData) => ({
      ...prevData,
      ambienceMusic: (prevData.ambienceMusic || []).filter((_, i) => i !== index)
    }));
  };

  return (
    <Box>
      <Accordion multiple>
        {/* Canciones de ingreso */}
        <Accordion.Item value='ingreso'>
          <Accordion.Control>Canciones de ingreso</Accordion.Control>
          <Accordion.Panel>
            <Stack gap='xs'>
              {(musicData.welcomeSongs || []).map((song, index) => (
                <Flex key={index} gap='xs' align='center'>
                  <TextInput
                    placeholder={`Tema ${index + 1}`}
                    value={song}
                    onChange={(e) => updateWelcomeSong(index, e.target.value)}
                    style={{ flex: 1 }}
                    size='sm'
                  />
                  <ActionIcon
                    color='red'
                    variant='subtle'
                    onClick={() => deleteWelcomeSong(index)}
                  >
                    <IconTrash size={16} />
                  </ActionIcon>
                </Flex>
              ))}
              <Button
                variant='light'
                size='xs'
                leftSection={<IconPlus size={14} />}
                onClick={addWelcomeSong}
              >
                Agregar tema
              </Button>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>

        {/* Canción de rosas */}
        <Accordion.Item value='rosas'>
          <Accordion.Control>Canción de rosas</Accordion.Control>
          <Accordion.Panel>
            <Stack gap='xs'>
              {(musicData.walkIn || []).map((song, index) => (
                <Flex key={index} gap='xs' align='center'>
                  <TextInput
                    placeholder={`Tema ${index + 1}`}
                    value={song}
                    onChange={(e) => updateWalkIn(index, e.target.value)}
                    style={{ flex: 1 }}
                    size='sm'
                  />
                  <ActionIcon
                    color='red'
                    variant='subtle'
                    onClick={() => deleteWalkIn(index)}
                  >
                    <IconTrash size={16} />
                  </ActionIcon>
                </Flex>
              ))}
              <Button
                variant='light'
                size='xs'
                leftSection={<IconPlus size={14} />}
                onClick={addWalkIn}
              >
                Agregar tema
              </Button>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>

        {/* Ceremonia Civil */}
        <Accordion.Item value='ceremonia-civil'>
          <Accordion.Control>Ceremonia Civil</Accordion.Control>
          <Accordion.Panel>
            <Stack gap='xs'>
              <TextInput
                label='Ingreso'
                placeholder='Canción de ingreso'
                value={musicData.ceremoniaCivil?.ingreso || ''}
                onChange={(e) =>
                  updateCeremony('ceremoniaCivil', 'ingreso', e.target.value)
                }
                size='sm'
              />
              <TextInput
                label='Firmas'
                placeholder='Canción de firmas'
                value={musicData.ceremoniaCivil?.firmas || ''}
                onChange={(e) =>
                  updateCeremony('ceremoniaCivil', 'firmas', e.target.value)
                }
                size='sm'
              />
              <TextInput
                label='Salida'
                placeholder='Canción de salida'
                value={musicData.ceremoniaCivil?.salida || ''}
                onChange={(e) =>
                  updateCeremony('ceremoniaCivil', 'salida', e.target.value)
                }
                size='sm'
              />

              {(musicData.ceremoniaCivil?.otros || []).length > 0 && (
                <Divider label='Otros momentos' labelPosition='center' />
              )}

              {(musicData.ceremoniaCivil?.otros || []).map((item, index) => (
                <Card key={index} withBorder p='xs'>
                  <Flex gap='xs' align='flex-end'>
                    <TextInput
                      label='Título'
                      placeholder='Ej: Entrada niños'
                      value={item.titulo}
                      onChange={(e) =>
                        updateCeremonyOtro(
                          'ceremoniaCivil',
                          index,
                          'titulo',
                          e.target.value
                        )
                      }
                      style={{ flex: 1 }}
                      size='sm'
                    />
                    <TextInput
                      label='Canción'
                      placeholder='Nombre de la canción'
                      value={item.cancion}
                      onChange={(e) =>
                        updateCeremonyOtro(
                          'ceremoniaCivil',
                          index,
                          'cancion',
                          e.target.value
                        )
                      }
                      style={{ flex: 1 }}
                      size='sm'
                    />
                    <ActionIcon
                      color='red'
                      variant='subtle'
                      onClick={() => deleteCeremonyOtro('ceremoniaCivil', index)}
                    >
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Flex>
                </Card>
              ))}

              <Button
                variant='light'
                size='xs'
                leftSection={<IconPlus size={14} />}
                onClick={() => addCeremonyOtro('ceremoniaCivil')}
              >
                Agregar otro momento
              </Button>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>

        {/* Ceremonia Extra */}
        <Accordion.Item value='ceremonia-extra'>
          <Accordion.Control>Ceremonia Extra</Accordion.Control>
          <Accordion.Panel>
            <Stack gap='xs'>
              <TextInput
                label='Ingreso'
                placeholder='Canción de ingreso'
                value={musicData.ceremoniaExtra?.ingreso || ''}
                onChange={(e) =>
                  updateCeremony('ceremoniaExtra', 'ingreso', e.target.value)
                }
                size='sm'
              />
              <TextInput
                label='Firmas'
                placeholder='Canción de firmas'
                value={musicData.ceremoniaExtra?.firmas || ''}
                onChange={(e) =>
                  updateCeremony('ceremoniaExtra', 'firmas', e.target.value)
                }
                size='sm'
              />
              <TextInput
                label='Salida'
                placeholder='Canción de salida'
                value={musicData.ceremoniaExtra?.salida || ''}
                onChange={(e) =>
                  updateCeremony('ceremoniaExtra', 'salida', e.target.value)
                }
                size='sm'
              />

              {(musicData.ceremoniaExtra?.otros || []).length > 0 && (
                <Divider label='Otros momentos' labelPosition='center' />
              )}

              {(musicData.ceremoniaExtra?.otros || []).map((item, index) => (
                <Card key={index} withBorder p='xs'>
                  <Flex gap='xs' align='flex-end'>
                    <TextInput
                      label='Título'
                      placeholder='Ej: Entrada niños'
                      value={item.titulo}
                      onChange={(e) =>
                        updateCeremonyOtro(
                          'ceremoniaExtra',
                          index,
                          'titulo',
                          e.target.value
                        )
                      }
                      style={{ flex: 1 }}
                      size='sm'
                    />
                    <TextInput
                      label='Canción'
                      placeholder='Nombre de la canción'
                      value={item.cancion}
                      onChange={(e) =>
                        updateCeremonyOtro(
                          'ceremoniaExtra',
                          index,
                          'cancion',
                          e.target.value
                        )
                      }
                      style={{ flex: 1 }}
                      size='sm'
                    />
                    <ActionIcon
                      color='red'
                      variant='subtle'
                      onClick={() => deleteCeremonyOtro('ceremoniaExtra', index)}
                    >
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Flex>
                </Card>
              ))}

              <Button
                variant='light'
                size='xs'
                leftSection={<IconPlus size={14} />}
                onClick={() => addCeremonyOtro('ceremoniaExtra')}
              >
                Agregar otro momento
              </Button>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>

        {/* Vals */}
        <Accordion.Item value='vals'>
          <Accordion.Control>Vals</Accordion.Control>
          <Accordion.Panel>
            <Stack gap='xs'>
              {(musicData.vals || []).map((song, index) => (
                <Flex key={index} gap='xs' align='center'>
                  <TextInput
                    placeholder={`Vals ${index + 1}`}
                    value={song}
                    onChange={(e) => updateVals(index, e.target.value)}
                    style={{ flex: 1 }}
                    size='sm'
                  />
                  <ActionIcon
                    color='red'
                    variant='subtle'
                    onClick={() => deleteVals(index)}
                  >
                    <IconTrash size={16} />
                  </ActionIcon>
                </Flex>
              ))}
              <Button
                variant='light'
                size='xs'
                leftSection={<IconPlus size={14} />}
                onClick={addVals}
              >
                Agregar vals
              </Button>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>

        {/* Inicio de fiesta */}
        <Accordion.Item value='fiesta'>
          <Accordion.Control>Inicio de fiesta (post cena)</Accordion.Control>
          <Accordion.Panel>
            <TextInput
              label='Canción apertura pista'
              placeholder='Nombre de la canción'
              value={musicData.openingPartySong || ''}
              onChange={(e) =>
                setMusicData({ ...musicData, openingPartySong: e.target.value })
              }
              size='sm'
            />
          </Accordion.Panel>
        </Accordion.Item>

        {/* Música para ambientar */}
        <Accordion.Item value='ambiente'>
          <Accordion.Control>Música para ambientar</Accordion.Control>
          <Accordion.Panel>
            <Stack gap='md'>
              {(musicData.ambienceMusic || []).map((category, categoryIndex) => (
                <Card key={categoryIndex} withBorder p='sm'>
                  <Stack gap='xs'>
                    <Flex gap='xs' align='flex-start'>
                      <TextInput
                        label='Momento/Descripción'
                        placeholder='Ej: Recepción, Cena, Sobremesa'
                        value={category.descripcion}
                        onChange={(e) =>
                          updateAmbienceDescription(categoryIndex, e.target.value)
                        }
                        style={{ flex: 1 }}
                        size='sm'
                      />
                      <ActionIcon
                        color='red'
                        variant='subtle'
                        onClick={() => deleteAmbienceCategory(categoryIndex)}
                        mt='xl'
                      >
                        <IconTrash size={16} />
                      </ActionIcon>
                    </Flex>

                    <Box>
                      <Text size='xs' fw={500} mb='xs'>
                        Géneros/Estilos:
                      </Text>
                      <Flex wrap='wrap' gap='xs' mb='xs'>
                        {category.generos.map((genre, genreIndex) => (
                          <Chip
                            key={genreIndex}
                            checked={false}
                            onChange={() =>
                              deleteAmbienceGenre(categoryIndex, genreIndex)
                            }
                            color='blue'
                            size='xs'
                          >
                            {genre}
                          </Chip>
                        ))}
                      </Flex>
                      <TextInput
                        placeholder='Agregar género/estilo (Enter para agregar)'
                        size='xs'
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const value = e.currentTarget.value;
                            addAmbienceGenre(categoryIndex, value);
                            e.currentTarget.value = '';
                          }
                        }}
                      />
                    </Box>
                  </Stack>
                </Card>
              ))}
              <Button
                variant='light'
                size='xs'
                leftSection={<IconPlus size={14} />}
                onClick={addAmbienceCategory}
              >
                Agregar categoría
              </Button>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>

        {/* Música de preferencia */}
        <Accordion.Item value='preferencias'>
          <Accordion.Control>Música de preferencia</Accordion.Control>
          <Accordion.Panel>
            {genresLoading ? (
              <Flex align='center' gap='sm'>
                <Loader size='sm' />
                <Text>Cargando géneros...</Text>
              </Flex>
            ) : genresError ? (
              <Alert icon={<IconAlertCircle size='1rem' />} color='red'>
                Error cargando géneros: {genresError}
              </Alert>
            ) : (
              <div className={styles.ratingContainer}>
                {musicData?.music.genres.map((genre: GenreType, index: number) => {
                  const options = [
                    { label: 'Mucho', value: 4, color: '#51cf66' },
                    { label: 'Normal', value: 3, color: '#ffd43b' },
                    { label: 'Poco', value: 2, color: '#fd7e14' },
                    { label: 'Nada', value: 1, color: '#fa5252' }
                  ];

                  return (
                    <div
                      className='eachRating'
                      key={genre.genre}
                      style={{ maxWidth: '100%' }}
                    >
                      <p style={{ marginBottom: '12px', fontWeight: 500 }}>
                        {genre.genre}
                      </p>
                      <Flex gap='sm' align='flex-start'>
                        {options.map((option) => (
                          <Flex
                            key={option.value}
                            direction='column'
                            align='center'
                            gap='4px'
                            style={{ flex: 1, maxWidth: '70px' }}
                          >
                            <UnstyledButton
                              onClick={() => rateGenre(option.value, index)}
                              style={{
                                width: '30px',
                                height: '30px',
                                borderRadius: '50%',
                                border:
                                  genre.value === option.value
                                    ? `3px solid ${option.color}`
                                    : '2px solid rgba(255, 255, 255, 0.2)',
                                backgroundColor:
                                  genre.value === option.value
                                    ? option.color
                                    : 'transparent',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                              }}
                              title={option.label}
                            />
                            <Text
                              size='10px'
                              c='dimmed'
                              ta='center'
                              style={{ lineHeight: 1.2 }}
                            >
                              {option.label}
                            </Text>
                          </Flex>
                        ))}
                      </Flex>
                    </div>
                  );
                })}
              </div>
            )}

            <Divider my='md' />

            <div className={styles.inputPair}>
              <Input
                className={styles.input}
                placeholder='Prohibidos'
                onChange={(e) => handleForbidden(e)}
                onKeyDown={handleForbidden}
                size='sm'
              />
              <Input
                className={styles.input}
                placeholder='Infaltables'
                onChange={(e) => handleRequired(e)}
                onKeyDown={handleRequired}
                size='sm'
              />
            </div>
            <div className={styles.inputPair}>
              <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap' }}>
                {musicData?.music.forbidden.map((song, index) => {
                  return (
                    <div key={song + index} style={{ margin: '8px' }}>
                      <Chip
                        icon={<IconX style={{ width: rem(16), height: rem(16) }} />}
                        id='forbidden'
                        color='red'
                        defaultChecked
                        onClick={() => {
                          deleteSongForbidden(song);
                        }}
                        size='sm'
                      >
                        {song}
                      </Chip>
                    </div>
                  );
                })}
              </div>
              <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap' }}>
                {musicData?.music.required.map((song, index) => {
                  return (
                    <div key={song + index} style={{ margin: '8px' }}>
                      <Chip
                        defaultChecked
                        color='green'
                        icon={<IconX style={{ width: rem(16), height: rem(16) }} />}
                        id='required'
                        onClick={() => deleteSongRequired(song)}
                        size='sm'
                      >
                        {song}
                      </Chip>
                    </div>
                  );
                })}
              </div>
            </div>
          </Accordion.Panel>
        </Accordion.Item>

        {/* Spotify Playlists */}
        <Accordion.Item value='spotify'>
          <Accordion.Control>Spotify Playlists</Accordion.Control>
          <Accordion.Panel>
            <Stack gap='sm'>
              <Flex gap='xs'>
                <TextInput
                  placeholder='Playlist Label'
                  value={spotifyLabelInputValue}
                  onChange={(e) => setSpotifyLabelInputValue(e.target.value)}
                  style={{ flex: 1 }}
                  size='sm'
                />
                <TextInput
                  placeholder='Spotify playlist URL'
                  value={spotifyLinkInputValue}
                  onChange={(e) => setSpotifyLinkInputValue(e.target.value)}
                  onKeyDown={handleSpotifyLinks}
                  style={{ flex: 2 }}
                  size='sm'
                />
                <Button size='sm' onClick={addSpotifyLinkButton}>
                  Agregar
                </Button>
              </Flex>

              {spotifyLinks.map((link, index) => (
                <Flex key={index} align='center' gap='xs'>
                  <Box style={{ flexGrow: 1, display: 'flex', alignItems: 'center' }}>
                    <Text fw={500} mr='xs' size='sm'>
                      {link.label}:
                    </Text>
                    <Text
                      size='sm'
                      style={{
                        flexGrow: 1,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {link.url}
                    </Text>
                  </Box>
                  <Button
                    variant='light'
                    size='xs'
                    onClick={() => window.open(link.url, '_blank')}
                  >
                    Visitar
                  </Button>
                  <ActionIcon
                    variant='light'
                    color='red'
                    onClick={() => {
                      setSpotifyLinks((links) => links.filter((_, i) => i !== index));
                    }}
                  >
                    <IconX size={16} />
                  </ActionIcon>
                </Flex>
              ))}
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>

      <Flex direction='column' gap='xs' mt='lg'>
        <Button onClick={back} >
          Atrás
        </Button>
        <Button onClick={next} disabled={genresLoading}>
          Siguiente
        </Button>
      </Flex>
    </Box>
  );
};

export default MusicForm;

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
import { useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { EventModel, CeremonyMusic, AmbienceMusicItem } from '@/context/types';
import { IconX, IconAlertCircle, IconPlus, IconTrash } from '@tabler/icons-react';
import styles from './MusicForm.module.css';
import { EVENT_TABS } from '@/context/config';
import { useGenres, transformGenresForMusic } from '@/hooks/useGenres';
import { usePermissions } from '@/hooks/usePermissions';

type GenreType = {
  genre: string;
  value: number;
};

type SpotifyLink = {
  label: string;
  url: string;
};

export interface MusicFormRef {
  getData: () => { musicData: EventModel; spotifyLinks: { label: string; url: string }[] };
}

const MusicForm = forwardRef<MusicFormRef, {
  event: EventModel;
  onNextTab: Function;
  onBackTab: Function;
  updateEvent?: Function;
  hideNavigation?: boolean;
  hiddenSections?: string[];
}>(({
  event,
  onNextTab,
  onBackTab,
  updateEvent,
  hideNavigation = false,
  hiddenSections = []
}, ref) => {
  const { can } = usePermissions();
  const canEditEvents = can('canEditEvents');
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
      openingPartySongs: Array.isArray(event.openingPartySongs) ? event.openingPartySongs : [],
      closingSongs: Array.isArray(event.closingSongs) ? event.closingSongs : [],
      customMoments: Array.isArray(event.customMoments) ? event.customMoments : [],
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
        openingPartySongs: Array.isArray(event.openingPartySongs) ? event.openingPartySongs : [],
        closingSongs: Array.isArray(event.closingSongs) ? event.closingSongs : [],
        customMoments: Array.isArray(event.customMoments) ? event.customMoments : [],
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

  // Expose getData function via ref
  useImperativeHandle(ref, () => ({
    getData: () => ({
      musicData,
      spotifyLinks
    })
  }));

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

  // Canciones de cierre handlers
  const addClosingSong = () => {
    setMusicData((prevData) => ({
      ...prevData,
      closingSongs: [...(prevData.closingSongs || []), '']
    }));
  };

  const updateClosingSong = (index: number, value: string) => {
    setMusicData((prevData) => ({
      ...prevData,
      closingSongs: (prevData.closingSongs || []).map((song, i) =>
        i === index ? value : song
      )
    }));
  };

  const deleteClosingSong = (index: number) => {
    setMusicData((prevData) => ({
      ...prevData,
      closingSongs: (prevData.closingSongs || []).filter((_, i) => i !== index)
    }));
  };

  // Momentos personalizados handlers
  const addCustomMoment = () => {
    setMusicData((prevData) => ({
      ...prevData,
      customMoments: [
        ...(prevData.customMoments || []),
        { titulo: '', cancion: '' }
      ]
    }));
  };

  const updateCustomMoment = (
    index: number,
    field: 'titulo' | 'cancion',
    value: string
  ) => {
    setMusicData((prevData) => ({
      ...prevData,
      customMoments: (prevData.customMoments || []).map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const deleteCustomMoment = (index: number) => {
    setMusicData((prevData) => ({
      ...prevData,
      customMoments: (prevData.customMoments || []).filter((_, i) => i !== index)
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

  // Apertura de pista handlers (ahora funciona como Vals)
  const addOpeningSong = () => {
    setMusicData((prevData) => ({
      ...prevData,
      openingPartySongs: [...(prevData.openingPartySongs || []), '']
    }));
  };

  const updateOpeningSong = (index: number, value: string) => {
    setMusicData((prevData) => ({
      ...prevData,
      openingPartySongs: (prevData.openingPartySongs || []).map((song, i) => (i === index ? value : song))
    }));
  };

  const deleteOpeningSong = (index: number) => {
    setMusicData((prevData) => ({
      ...prevData,
      openingPartySongs: (prevData.openingPartySongs || []).filter((_, i) => i !== index)
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

  // Helper para verificar si debe mostrar un acordeón
  const shouldShowSection = (sectionId: string) => {
    return !hiddenSections.includes(sectionId);
  };

  return (
    <Box>
      <Accordion multiple>
        {/* Canciones de ingreso */}
        {shouldShowSection('ingreso') && (
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
                    disabled={!canEditEvents}
                  />
                  <ActionIcon
                    color='red'
                    variant='subtle'
                    onClick={() => deleteWelcomeSong(index)}
                    disabled={!canEditEvents}
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
                disabled={!canEditEvents}
              >
                Agregar tema
              </Button>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>
        )}

        {/* Canción de rosas */}
        {shouldShowSection('rosas') && (
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
                    disabled={!canEditEvents}
                  />
                  <ActionIcon
                    color='red'
                    variant='subtle'
                    onClick={() => deleteWalkIn(index)}
                    disabled={!canEditEvents}
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
                disabled={!canEditEvents}
              >
                Agregar tema
              </Button>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>
        )}

        {/* Ceremonia Civil */}
        {shouldShowSection('ceremonia-civil') && (
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
                disabled={!canEditEvents}
              />
              <TextInput
                label='Firmas'
                placeholder='Canción de firmas'
                value={musicData.ceremoniaCivil?.firmas || ''}
                onChange={(e) =>
                  updateCeremony('ceremoniaCivil', 'firmas', e.target.value)
                }
                size='sm'
                disabled={!canEditEvents}
              />
              <TextInput
                label='Salida'
                placeholder='Canción de salida'
                value={musicData.ceremoniaCivil?.salida || ''}
                onChange={(e) =>
                  updateCeremony('ceremoniaCivil', 'salida', e.target.value)
                }
                size='sm'
                disabled={!canEditEvents}
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
                      disabled={!canEditEvents}
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
                      disabled={!canEditEvents}
                    />
                    <ActionIcon
                      color='red'
                      variant='subtle'
                      onClick={() => deleteCeremonyOtro('ceremoniaCivil', index)}
                      disabled={!canEditEvents}
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
                disabled={!canEditEvents}
              >
                Agregar otro momento
              </Button>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>
        )}

        {/* Ceremonia Extra */}
        {shouldShowSection('ceremonia-extra') && (
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
                disabled={!canEditEvents}
              />
              <TextInput
                label='Firmas'
                placeholder='Canción de firmas'
                value={musicData.ceremoniaExtra?.firmas || ''}
                onChange={(e) =>
                  updateCeremony('ceremoniaExtra', 'firmas', e.target.value)
                }
                size='sm'
                disabled={!canEditEvents}
              />
              <TextInput
                label='Salida'
                placeholder='Canción de salida'
                value={musicData.ceremoniaExtra?.salida || ''}
                onChange={(e) =>
                  updateCeremony('ceremoniaExtra', 'salida', e.target.value)
                }
                size='sm'
                disabled={!canEditEvents}
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
                      disabled={!canEditEvents}
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
                      disabled={!canEditEvents}
                    />
                    <ActionIcon
                      color='red'
                      variant='subtle'
                      onClick={() => deleteCeremonyOtro('ceremoniaExtra', index)}
                      disabled={!canEditEvents}
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
                disabled={!canEditEvents}
              >
                Agregar otro momento
              </Button>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>
        )}

        {/* Vals */}
        {shouldShowSection('vals') && (
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
                    disabled={!canEditEvents}
                  />
                  <ActionIcon
                    color='red'
                    variant='subtle'
                    onClick={() => deleteVals(index)}
                    disabled={!canEditEvents}
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
                disabled={!canEditEvents}
              >
                Agregar vals
              </Button>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>
        )}

        {/* Apertura de pista */}
        {shouldShowSection('fiesta') && (
          <Accordion.Item value='fiesta'>
            <Accordion.Control>Apertura de pista</Accordion.Control>
          <Accordion.Panel>
            <Stack gap='xs'>
              {(musicData.openingPartySongs || []).map((song, index) => (
                <Flex key={index} gap='xs' align='center'>
                  <TextInput
                    placeholder={`Apertura de pista ${index + 1}`}
                    value={song}
                    onChange={(e) => updateOpeningSong(index, e.target.value)}
                    style={{ flex: 1 }}
                    size='sm'
                    disabled={!canEditEvents}
                  />
                  <ActionIcon
                    color='red'
                    variant='subtle'
                    onClick={() => deleteOpeningSong(index)}
                    disabled={!canEditEvents}
                  >
                    <IconTrash size={16} />
                  </ActionIcon>
                </Flex>
              ))}
              <Button
                variant='light'
                size='xs'
                leftSection={<IconPlus size={14} />}
                onClick={addOpeningSong}
                disabled={!canEditEvents}
              >
                Agregar apertura de pista
              </Button>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>
        )}

        {/* Música para ambientar */}
        {shouldShowSection('ambiente') && (
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
                        disabled={!canEditEvents}
                      />
                      <ActionIcon
                        color='red'
                        variant='subtle'
                        onClick={() => deleteAmbienceCategory(categoryIndex)}
                        mt='xl'
                        disabled={!canEditEvents}
                      >
                        <IconTrash size={16} />
                      </ActionIcon>
                    </Flex>

                    <Box>
                      <Text size='xs' fw={500} mb='xs'>
                        Géneros/Estilos:
                      </Text>
                      <Flex wrap='wrap' gap='xs' mb='xs'>
                        {(category.generos || []).map((genre, genreIndex) => (
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
                        disabled={!canEditEvents}
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
                disabled={!canEditEvents}
              >
                Agregar categoría
              </Button>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>
        )}

        {/* Canciones de cierre */}
        {shouldShowSection('cierre') && (
          <Accordion.Item value='cierre'>
            <Accordion.Control>Canciones para cierre</Accordion.Control>
          <Accordion.Panel>
                        <Stack gap='xs'>
              {(musicData.closingSongs || []).map((song, index) => (
                <Flex key={index} gap='xs' align='center'>
                  <TextInput
                    placeholder={`Tema ${index + 1}`}
                    value={song}
                    onChange={(e) => updateClosingSong(index, e.target.value)}
                    style={{ flex: 1 }}
                    size='sm'
                    disabled={!canEditEvents}
                  />
                  <ActionIcon
                    color='red'
                    variant='subtle'
                    onClick={() => deleteClosingSong(index)}
                    disabled={!canEditEvents}
                  >
                    <IconTrash size={16} />
                  </ActionIcon>
                </Flex>
              ))}
              <Button
                variant='light'
                size='xs'
                leftSection={<IconPlus size={14} />}
                onClick={addClosingSong}
                disabled={!canEditEvents}
              >
                Agregar tema
              </Button>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>
        )}

        {/* Agregar momentos - Nueva sección */}
        {shouldShowSection('momentos') && (
          <Accordion.Item value='momentos'>
            <Accordion.Control>Agregar momentos</Accordion.Control>
          <Accordion.Panel>
            <Stack gap='xs'>
              {(musicData.customMoments || []).length > 0 && (
                <Divider label='Momentos agregados' labelPosition='center' />
              )}

              {(musicData.customMoments || []).map((item, index) => (
                <Card key={index} withBorder p='xs'>
                  <Flex gap='xs' align='flex-end'>
                    <TextInput
                      label='Título'
                      placeholder='Ej: Entrada de padrinos'
                      value={item.titulo}
                      onChange={(e) =>
                        updateCustomMoment(index, 'titulo', e.target.value)
                      }
                      style={{ flex: 1 }}
                      size='sm'
                      disabled={!canEditEvents}
                    />
                    <TextInput
                      label='Canción'
                      placeholder='Nombre de la canción'
                      value={item.cancion}
                      onChange={(e) =>
                        updateCustomMoment(index, 'cancion', e.target.value)
                      }
                      style={{ flex: 1 }}
                      size='sm'
                      disabled={!canEditEvents}
                    />
                    <ActionIcon
                      color='red'
                      variant='subtle'
                      onClick={() => deleteCustomMoment(index)}
                      disabled={!canEditEvents}
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
                onClick={addCustomMoment}
                disabled={!canEditEvents}
              >
                Agregar momento
              </Button>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>
        )}

        {/* Música de preferencia */}
        {shouldShowSection('preferencias') && (
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
              <Flex wrap='wrap' gap='xl' align='flex-start' justify='center'>
                {musicData?.music.genres.map((genre: GenreType, index: number) => {
                  const options = [
                    { label: 'Mucho', value: 4, color: '#51cf66' },
                    { label: 'Normal', value: 3, color: '#ffd43b' },
                    { label: 'Poco', value: 2, color: '#fd7e14' },
                    { label: 'Nada', value: 1, color: '#fa5252' }
                  ];

                  return (
                    <Flex key={genre.genre} align='flex-start' gap='lg'>
                      <Box style={{ minWidth: '180px' }}>
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
                                disabled={!canEditEvents}
                                style={{
                                  width: '25px',
                                  height: '25px',
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
                      </Box>
                      {index < musicData.music.genres.length - 1 && (
                        <Divider orientation='vertical' size='xs' />
                      )}
                    </Flex>
                  );
                })}
              </Flex>
            )}

            <Divider my='md' />

            <div className={styles.inputPair}>
              <Input
                className={styles.input}
                placeholder='Prohibidos'
                onChange={(e) => handleForbidden(e)}
                onKeyDown={handleForbidden}
                size='sm'
                disabled={!canEditEvents}
              />
              <Input
                className={styles.input}
                placeholder='Infaltables'
                onChange={(e) => handleRequired(e)}
                onKeyDown={handleRequired}
                size='sm'
                disabled={!canEditEvents}
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
        )}

        {/* Spotify Playlists */}
        {shouldShowSection('spotify') && (
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
                  disabled={!canEditEvents}
                />
                <TextInput
                  placeholder='Spotify playlist URL'
                  value={spotifyLinkInputValue}
                  onChange={(e) => setSpotifyLinkInputValue(e.target.value)}
                  onKeyDown={handleSpotifyLinks}
                  style={{ flex: 2 }}
                  size='sm'
                  disabled={!canEditEvents}
                />
                <Button size='sm' onClick={addSpotifyLinkButton} disabled={!canEditEvents}>
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
                    disabled={!canEditEvents}
                  >
                    <IconX size={16} />
                  </ActionIcon>
                </Flex>
              ))}
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>
        )}
      </Accordion>

      {!hideNavigation && (
        <Flex direction='column' gap='xs' mt='lg'>
          <Button onClick={back}>
            Atrás
          </Button>
          <Button onClick={next} disabled={genresLoading}>
            Siguiente
          </Button>
        </Flex>
      )}
    </Box>
  );
});

MusicForm.displayName = 'MusicForm';

export default MusicForm;

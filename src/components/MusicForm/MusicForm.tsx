import {
  Box,
  Button,
  Chip,
  Flex,
  Input,
  Rating,
  rem,
  Text,
  Loader,
  Alert
} from '@mantine/core';
import { useEffect, useState } from 'react';
import { EventModel } from '@/context/types';
import { IconX, IconAlertCircle, IconPlus } from '@tabler/icons-react';
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
  onBackTab
}: {
  event: EventModel;
  onNextTab: Function;
  onBackTab: Function;
}) => {
  const {
    genres: dbGenres,
    loading: genresLoading,
    error: genresError
  } = useGenres();
  const [musicData, setMusicData] = useState(() => {
    // Ensure array fields are always arrays
    const normalizedEvent = {
      ...event,
      welcomeSongs: Array.isArray(event.welcomeSongs)
        ? event.welcomeSongs
        : event.welcomeSongs
        ? [event.welcomeSongs as string]
        : [],
      walkIn: Array.isArray(event.walkIn)
        ? event.walkIn
        : event.walkIn
        ? [event.walkIn as string]
        : [],
      vals: Array.isArray(event.vals)
        ? event.vals
        : event.vals
        ? [event.vals as string]
        : [],
      ambienceMusic: Array.isArray(event.ambienceMusic)
        ? event.ambienceMusic
        : event.ambienceMusic
        ? [event.ambienceMusic as string]
        : []
    };
    return normalizedEvent;
  });
  const [spotifyLinks, setSpotifyLinks] = useState<SpotifyLink[]>([]);
  const [spotifyLinkInputValue, setSpotifyLinkInputValue] = useState('');
  const [spotifyLabelInputValue, setSpotifyLabelInputValue] = useState('');
  const [welcomeSongInputValue, setWelcomeSongInputValue] = useState('');
  const [walkInInputValue, setWalkInInputValue] = useState('');
  const [valsInputValue, setValsInputValue] = useState('');
  const [ambienceMusicInputValue, setAmbienceMusicInputValue] = useState('');

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
        if (!prevData) return null; // Ensure prevData is not null
        const updatedMusicData = {
          ...prevData,
          music: {
            ...prevData.music,
            forbidden: [...(prevData.music?.forbidden || []), value]
          }
        };
        return updatedMusicData as any; // Cast to SelectedEventType to resolve type mismatch
      });
      target.value = '';
    }
  };
  const handleRequired = (e: any) => {
    const target = e.target as HTMLInputElement;
    const value = target.value;
    if (e.key === 'Enter') {
      setMusicData((prevData) => {
        if (!prevData) return null; // Ensure prevData is not null
        const updatedMusicData = {
          ...prevData,
          music: {
            ...prevData.music,
            required: [...(prevData.music?.required || []), value]
          }
        };
        return updatedMusicData as any; // Cast to SelectedEventType to resolve type mismatch
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
      return updatedMusicData; // No need to cast to any
    });
  };
  const deleteSongForbidden = (arg: any) => {
    const newList = musicData?.music.forbidden.filter((song) => song !== arg);
    setMusicData((prevData: any) => {
      if (!prevData) return null; // Ensure prevData is not null
      return {
        ...prevData,
        music: {
          ...prevData.music,
          forbidden: newList
        },
        allDay: prevData.allDay ?? false // Provide a default boolean value for allDay
      };
    });
  };
  const deleteSongRequired = (arg: any) => {
    const newList = musicData?.music.required.filter((song) => song !== arg);
    setMusicData((prevData: any) => {
      if (!prevData) return null; // Ensure prevData is not null
      return {
        ...prevData,
        music: {
          ...prevData.music,
          required: newList
        },
        allDay: prevData.allDay ?? false // Provide a default boolean value for allDay
      };
    });
  };
  const next = () => {
    onNextTab(EVENT_TABS.EQUIPMENT, { ...musicData, playlist: spotifyLinks });
  };
  const back = () => {
    onBackTab(EVENT_TABS.EVENT, { ...musicData, playlist: spotifyLinks });
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

  const handleWelcomeSong = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      addWelcomeSong();
    }
  };

  const addWelcomeSong = () => {
    if (welcomeSongInputValue.trim()) {
      setMusicData((prevData) => ({
        ...prevData,
        welcomeSongs: [
          ...(prevData.welcomeSongs || []),
          welcomeSongInputValue.trim()
        ]
      }));
      setWelcomeSongInputValue('');
    }
  };

  const deleteWelcomeSong = (songToDelete: string) => {
    setMusicData((prevData) => ({
      ...prevData,
      welcomeSongs: (prevData.welcomeSongs || []).filter(
        (song) => song !== songToDelete
      )
    }));
  };

  const handleWalkIn = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      addWalkIn();
    }
  };

  const addWalkIn = () => {
    if (walkInInputValue.trim()) {
      setMusicData((prevData) => ({
        ...prevData,
        walkIn: [...(prevData.walkIn || []), walkInInputValue.trim()]
      }));
      setWalkInInputValue('');
    }
  };

  const deleteWalkIn = (songToDelete: string) => {
    setMusicData((prevData) => ({
      ...prevData,
      walkIn: (prevData.walkIn || []).filter((song) => song !== songToDelete)
    }));
  };

  const handleVals = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      addVals();
    }
  };

  const addVals = () => {
    if (valsInputValue.trim()) {
      setMusicData((prevData) => ({
        ...prevData,
        vals: [...(prevData.vals || []), valsInputValue.trim()]
      }));
      setValsInputValue('');
    }
  };

  const deleteVals = (songToDelete: string) => {
    setMusicData((prevData) => ({
      ...prevData,
      vals: (prevData.vals || []).filter((song) => song !== songToDelete)
    }));
  };

  const handleAmbienceMusic = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      addAmbienceMusic();
    }
  };

  const addAmbienceMusic = () => {
    if (ambienceMusicInputValue.trim()) {
      setMusicData((prevData) => ({
        ...prevData,
        ambienceMusic: [
          ...(prevData.ambienceMusic || []),
          ambienceMusicInputValue.trim()
        ]
      }));
      setAmbienceMusicInputValue('');
    }
  };

  const deleteAmbienceMusic = (songToDelete: string) => {
    setMusicData((prevData) => ({
      ...prevData,
      ambienceMusic: (prevData.ambienceMusic || []).filter(
        (song) => song !== songToDelete
      )
    }));
  };

  return (
    <div>
      <h2>Canciones de ingreso</h2>
      <Flex mb='md' gap='8px'>
        <Input
          placeholder='Agregar canción de ingreso'
          value={welcomeSongInputValue}
          onChange={(e) => setWelcomeSongInputValue(e.target.value)}
          onKeyDown={handleWelcomeSong}
          style={{ flexGrow: 1 }}
        />
        <Button onClick={addWelcomeSong} leftSection={<IconPlus size={16} />}>
          Agregar
        </Button>
      </Flex>

      <div style={{ marginBottom: '16px' }}>
        {(musicData.welcomeSongs || []).map((song, index) => (
          <div
            key={song + index}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 12px',
              marginBottom: '4px',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '4px',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}
          >
            <Text size='sm' c='white' className='breakWord' style={{ flex: 1, paddingRight: '8px' }}>
              {song}
            </Text>
            <IconX
              cursor='pointer'
              size={16}
              color='red'
              onClick={() => deleteWelcomeSong(song)}
            />
          </div>
        ))}
      </div>
      <h2>Camino de Rosas</h2>
      <Flex mb='md' gap='8px'>
        <Input
          placeholder='Agregar canción de camino de rosas'
          value={walkInInputValue}
          onChange={(e) => setWalkInInputValue(e.target.value)}
          onKeyDown={handleWalkIn}
          style={{ flexGrow: 1 }}
        />
        <Button onClick={addWalkIn} leftSection={<IconPlus size={16} />}>
          Agregar
        </Button>
      </Flex>

      <div style={{ marginBottom: '16px' }}>
        {(musicData.walkIn || []).map((song, index) => (
          <div
            key={song + index}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 12px',
              marginBottom: '4px',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '4px',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}
          >
            <Text size='sm' c='white' className='breakWord' style={{ flex: 1, paddingRight: '8px' }}>
              {song}
            </Text>
            <IconX
              cursor='pointer'
              size={16}
              color='red'
              onClick={() => deleteWalkIn(song)}
            />
          </div>
        ))}
      </div>

      <h2>Vals</h2>
      <Flex mb='md' gap='8px'>
        <Input
          placeholder='Agregar vals'
          value={valsInputValue}
          onChange={(e) => setValsInputValue(e.target.value)}
          onKeyDown={handleVals}
          style={{ flexGrow: 1 }}
        />
        <Button onClick={addVals} leftSection={<IconPlus size={16} />}>
          Agregar
        </Button>
      </Flex>

      <div style={{ marginBottom: '16px' }}>
        {(musicData.vals || []).map((song, index) => (
          <div
            key={song + index}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 12px',
              marginBottom: '4px',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '4px',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}
          >
            <Text size='sm' c='white' className='breakWord' style={{ flex: 1, paddingRight: '8px' }}>
              {song}
            </Text>
            <IconX
              cursor='pointer'
              size={16}
              color='red'
              onClick={() => deleteVals(song)}
            />
          </div>
        ))}
      </div>
      <h2>Inicio de fiesta - Cancion apertura de fiesta</h2>
      <Input
        placeholder='Inicio de fiesta - Cancion apertura de fiesta'
        value={musicData.openingPartySong}
        onChange={(e) =>
          setMusicData({ ...musicData, openingPartySong: e.target.value })
        }
        mb='md'
      />
      <h2>Música para ambientar</h2>
      <Flex mb='md' gap='8px'>
        <Input
          placeholder='Agregar música para ambientar'
          value={ambienceMusicInputValue}
          onChange={(e) => setAmbienceMusicInputValue(e.target.value)}
          onKeyDown={handleAmbienceMusic}
          style={{ flexGrow: 1 }}
        />
        <Button onClick={addAmbienceMusic} leftSection={<IconPlus size={16} />}>
          Agregar
        </Button>
      </Flex>

      <div style={{ marginBottom: '16px' }}>
        {(musicData.ambienceMusic || []).map((song, index) => (
          <div
            key={song + index}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 12px',
              marginBottom: '4px',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '4px',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}
          >
            <Text size='sm' c='white' className='breakWord' style={{ flex: 1, paddingRight: '8px' }}>
              {song}
            </Text>
            <IconX
              cursor='pointer'
              size={16}
              color='red'
              onClick={() => deleteAmbienceMusic(song)}
            />
          </div>
        ))}
      </div>
      <h2>Musica de preferencia</h2>

      {/* Genres Loading/Error States */}
      {genresLoading ? (
        <Flex align='center' gap='sm' mb='md'>
          <Loader size='sm' />
          <Text>Cargando géneros...</Text>
        </Flex>
      ) : genresError ? (
        <Alert icon={<IconAlertCircle size='1rem' />} color='red' mb='md'>
          Error cargando géneros: {genresError}
        </Alert>
      ) : (
        <div className={styles.ratingContainer}>
          {musicData?.music.genres.map((genre: GenreType, index: number) => {
            return (
              <div className='eachRating' key={genre.genre}>
                <p>{genre.genre}</p>
                <Rating
                  value={genre.value}
                  onChange={(e) => rateGenre(e as any, index)}
                />
              </div>
            );
          })}
        </div>
      )}

      <div className={styles.inputPair}>
        <Input
          className={styles.input}
          placeholder='Prohibidos'
          onChange={(e) => handleForbidden(e)}
          onKeyDown={handleForbidden}
        />
        <Input
          className={styles.input}
          placeholder='Infaltables'
          onChange={(e) => handleRequired(e)}
          onKeyDown={handleRequired}
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
                >
                  {song}
                </Chip>
              </div>
            );
          })}
        </div>
      </div>
      <Box mt='md'>
        <Text fw={500} size='lg' mb='xs'>
          Spotify Playlists
        </Text>
        <Flex mb='md' gap='8px'>
          <Input
            placeholder='Playlist Label'
            value={spotifyLabelInputValue}
            onChange={(e) => setSpotifyLabelInputValue(e.target.value)}
            style={{ flexGrow: 1 }}
          />
          <Input
            placeholder='Spotify playlist URL'
            value={spotifyLinkInputValue}
            onChange={(e) => setSpotifyLinkInputValue(e.target.value)}
            onKeyDown={handleSpotifyLinks}
            style={{ flexGrow: 2 }}
          />
          <Button onClick={addSpotifyLinkButton}>Agregar</Button>
        </Flex>

        {spotifyLinks.map((link, index) => (
          <Flex key={index} align='center' mb='xs' gap='8px'>
            <Box style={{ flexGrow: 1, display: 'flex', alignItems: 'center' }}>
              <Text fw={500} mr='xs'>
                {link.label}:
              </Text>
              <Text
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
              onClick={() => window.open(link.url, '_blank')}
            >
              Visitar
            </Button>
            <Button
              variant='light'
              color='red'
              onClick={() => {
                setSpotifyLinks((links) => links.filter((_, i) => i !== index));
              }}
            >
              <IconX size={16} />
            </Button>
          </Flex>
        ))}
      </Box>
      <Flex direction='column' gap='12px'>
        <Button onClick={back}>Anterior</Button>
        <Button onClick={next} disabled={genresLoading}>
          Siguiente
        </Button>
      </Flex>
    </div>
  );
};

export default MusicForm;

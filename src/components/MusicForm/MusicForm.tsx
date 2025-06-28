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
import { IconX, IconAlertCircle } from '@tabler/icons-react';
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
  const [musicData, setMusicData] = useState(event);
  const [spotifyLinks, setSpotifyLinks] = useState<SpotifyLink[]>([]);
  const [spotifyLinkInputValue, setSpotifyLinkInputValue] = useState('');
  const [spotifyLabelInputValue, setSpotifyLabelInputValue] = useState('');

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
    if (spotifyLinkInputValue && spotifyLabelInputValue) {
      setSpotifyLinks((prev) => [
        ...prev,
        { label: spotifyLabelInputValue, url: spotifyLinkInputValue }
      ]);
      setSpotifyLinkInputValue('');
      setSpotifyLabelInputValue('');
    }
  };

  return (
    <div>
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

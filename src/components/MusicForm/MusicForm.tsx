import { useDeganoCtx } from '@/context/DeganoContext';
import { Button, Chip, Flex, Input, Rating, rem } from '@mantine/core';
import { useId, useState } from 'react';
import { EventModel } from '@/context/types';
import { IconX } from '@tabler/icons-react';
import styles from './MusicForm.module.css';

type GenreType = {
  genre: string;
  value: number;
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
  const { setFormSted } = useDeganoCtx();
  const [musicData, setMusicData] = useState(event);
  const id = useId();

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
    console.log(value);
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
    console.log(arg);
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
  return (
    <div>
      <h2>Musica de preferencia</h2>
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
      <Flex direction='column' gap='12px'>
        <Button onClick={() => setFormSted((prev: number) => prev - 1)}>
          Anterior
        </Button>
        <Button onClick={() => setFormSted((prev: number) => prev + 1)}>
          Siguiente
        </Button>
      </Flex>
    </div>
  );
};

export default MusicForm;

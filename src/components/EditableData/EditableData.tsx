import { useDeganoCtx } from '@/context/DeganoContext';
import {
  Box,
  CheckIcon,
  CloseIcon,
  Flex,
  Input,
  Rating,
  Text,
  Textarea
} from '@mantine/core';
import { IconEdit, IconStar, IconStarFilled } from '@tabler/icons-react';
import { cloneDeep, isEqual } from 'lodash';
import React, { useState } from 'react';
import useLoadingCursor from '../../hooks/useLoadingCursor';
import useNotification from '../../hooks/useNotification';

const EditableData = ({
  title,
  value,
  property,
  type
}: {
  title?: string;
  value: string | any[];
  property: string;
  type: string;
}) => {
  const { selectedEvent } = useDeganoCtx();
  const [loading, setLoading] = useState(false);
  const [editState, setEditState] = useState({
    showInput: false,
    showEditableChips: false,
    showEditableRating: false,
    inputValue: value,
    newChip: ''
  });

  useLoadingCursor(loading);
  const notify = useNotification();

  const updateEvent = async (event: any) => {
    setLoading(true);
    notify('', '', '', true);
    const areOjectsEqual = isEqual(selectedEvent, event);
    if (areOjectsEqual) return;
    const timeStamp = new Date().toISOString();
    try {
      const response = await fetch(`/api/updateEvent?id=${timeStamp}`, {
        method: 'PUT',
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(event)
      });
      const data = await response.json();
      notify();
      console.log(data);
    } catch (error) {
      notify('Operación errónea', 'Algo salio mal, vuelve a intentarlo', 'red');
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const toggleEdit = (field: keyof typeof editState, action: string) => {
    const eventCopy = cloneDeep(selectedEvent) as Record<string, any>;
    if (
      property === 'forbidden' ||
      property === 'required' ||
      property === 'genres'
    ) {
      eventCopy.music[property] = editState.inputValue;
    } else {
      if (selectedEvent) {
        if (property in eventCopy) {
          eventCopy[property] = editState.inputValue;
        }
      }
    }
    if (action === 'save') {
      updateEvent(eventCopy);
    }
    setEditState((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const handleInputChange = (e: any) => {
    setEditState((prev) => ({ ...prev, inputValue: e.target.value }));
  };

  const handleChipChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditState((prev) => ({ ...prev, newChip: e.target.value }));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && Array.isArray(editState.inputValue)) {
      setEditState((prev) => ({
        ...prev,
        inputValue: [...(prev.inputValue as string[]), prev.newChip],
        newChip: ''
      }));
    }
  };
  const removeChip = (genre: string) => {
    setEditState((prev) => ({
      ...prev,
      inputValue: Array.isArray(prev.inputValue)
        ? prev.inputValue.filter((val) => val !== genre)
        : prev.inputValue
    }));
  };

  const rateGenre = (value: any, index: number) => {
    setEditState((prev) => ({
      ...prev,
      inputValue: (prev.inputValue as any[]).map((genre, idx) =>
        idx === index ? { ...genre, value: value } : genre
      )
    }));
  };

  const typeTextData = () => (
    <Flex gap='8px' align='center' py='10px' justify='space-between'>
      <Box w='100%'>
        {title && <strong>{title}:</strong>}
        {editState.showInput ? (
          <Input
            width='100%'
            onChange={handleInputChange}
            value={editState.inputValue}
          />
        ) : (
          <p style={{ paddingLeft: '12px' }}>{editState.inputValue}</p>
        )}
      </Box>
      {editState.showInput ? (
        <CheckIcon
          cursor='pointer'
          size={22}
          color='green'
          onClick={() => toggleEdit('showInput', 'save')}
        />
      ) : (
        <IconEdit
          cursor='pointer'
          size={22}
          onClick={() => toggleEdit('showInput', 'open')}
        />
      )}
    </Flex>
  );

  const typeChipsData = () => (
    <>
      {editState.showEditableChips && (
        <Input
          mb='16px'
          value={editState.newChip}
          onKeyDown={handleKeyDown}
          onChange={handleChipChange}
          placeholder='Add new chip'
        />
      )}
      <Flex justify='space-between'>
        <Flex gap='8px'>
          {Array.isArray(editState.inputValue) &&
            editState.inputValue.map((genre, i) => (
              <Flex
                key={genre + i}
                style={{
                  borderRadius: '6px',
                  padding: '3px 6px',
                  backgroundColor: property === 'required' ? 'green' : 'red'
                }}
              >
                <Text fw='600' c='white'>
                  {genre}
                </Text>
                {editState.showEditableChips && (
                  <CloseIcon
                    size={'22'}
                    cursor='pointer'
                    onClick={() => removeChip(genre)}
                  />
                )}
              </Flex>
            ))}
        </Flex>
        {editState.showEditableChips ? (
          <CheckIcon
            style={{ marginLeft: '12px' }}
            cursor='pointer'
            size={22}
            color='green'
            onClick={() => toggleEdit('showEditableChips', 'save')}
          />
        ) : (
          <IconEdit
            cursor='pointer'
            style={{ marginLeft: '12px' }}
            size={22}
            onClick={() => toggleEdit('showEditableChips', 'open')}
          />
        )}
      </Flex>
    </>
  );

  const typeRatingData = () => (
    <>
      {editState.showEditableRating ? (
        <>
          <CheckIcon
            color='green'
            size='22'
            onClick={() => toggleEdit('showEditableRating', 'save')}
          />
          {Array.isArray(editState.inputValue) &&
            editState.inputValue.map((genre, i) => (
              <Flex
                gap='6px'
                key={genre + i}
                align='center'
                py='10px'
                style={{
                  borderBottom: 'solid 1px white'
                }}
              >
                <Text miw='80px'>{genre.genre}</Text>
                <Rating
                  value={genre.value}
                  onChange={(e) => rateGenre(e as any, i)}
                />
              </Flex>
            ))}
        </>
      ) : (
        <>
          <IconEdit
            size='22'
            onClick={() => toggleEdit('showEditableRating', 'open')}
          />
          <Box>
            {Array.isArray(editState.inputValue) &&
              editState.inputValue.map((genre, i) => (
                <div
                  key={`i${i}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '12px 0',
                    borderBottom: 'solid 1px grey'
                  }}
                >
                  <div style={{ minWidth: '80px' }}>
                    <p
                      style={{
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                    >
                      {genre.genre}
                    </p>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    {Array.from({ length: genre.value }, (_, idx) => (
                      <IconStarFilled
                        color='gold'
                        key={`filled-${genre.genre}-${idx}`}
                      />
                    ))}
                    {Array.from({ length: 5 - genre.value }, (_, idx) => (
                      <IconStar
                        color='gold'
                        key={`empty-${genre.genre}-${idx}`}
                      />
                    ))}
                  </div>
                </div>
              ))}
          </Box>
        </>
      )}
    </>
  );

  const typeTextArea = () => {
    return (
      <Flex
        gap='8px'
        align='center'
        py='10px'
        justify='space-between'
        style={{
          borderBottom: '1px solid white'
        }}
      >
        <Box w='100%'>
          {title && <strong>{title}:</strong>}
          {editState.showInput ? (
            <Textarea
              onChange={handleInputChange}
              value={editState.inputValue}
            />
          ) : (
            <p style={{ paddingLeft: '12px' }}>{editState.inputValue}</p>
          )}
        </Box>
        {editState.showInput ? (
          <CheckIcon
            cursor='pointer'
            size={22}
            color='green'
            onClick={() => toggleEdit('showInput', 'save')}
          />
        ) : (
          <IconEdit
            cursor='pointer'
            size={22}
            onClick={() => toggleEdit('showInput', 'open')}
          />
        )}
      </Flex>
    );
  };

  return (
    <>
      {type === 'text' ? (
        typeTextData()
      ) : type === 'chips' ? (
        typeChipsData()
      ) : type === 'rate' ? (
        typeRatingData()
      ) : type === 'textarea' ? (
        typeTextArea()
      ) : (
        <></>
      )}
    </>
  );
};

export default EditableData;

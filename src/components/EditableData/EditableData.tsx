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
import { DateTimePicker } from '@mantine/dates';
import {
  IconEdit,
  IconStar,
  IconStarFilled,
  IconPlus,
  IconX
} from '@tabler/icons-react';
import { cloneDeep, isEqual } from 'lodash';
import React, { useState } from 'react';
import useLoadingCursor from '@/hooks/useLoadingCursor';
import useNotification from '@/hooks/useNotification';

const EditableData = ({
  title,
  value,
  property,
  type,
  style
}: {
  title?: string;
  value: string | any[] | Date;
  property: string;
  type: string;
  style?: React.CSSProperties;
}) => {
  const { selectedEvent } = useDeganoCtx();
  const setLoadingCursor = useLoadingCursor();
  const [editState, setEditState] = useState({
    showInput: false,
    showEditableChips: false,
    showEditableRating: false,
    showEditableStringArray: false,
    showEditableDate: false,
    inputValue: value as string | any[] | Date | null,
    newChip: '',
    newStringItem: ''
  });
  const [textHover, setTextHover] = useState(false);
  //  const [textareaHover, setTextareaHover] = useState(false);

  const notify = useNotification();

  const updateEvent = async (event: any) => {
    const areOjectsEqual = isEqual(selectedEvent, event);
    if (areOjectsEqual) return;
    setLoadingCursor(true);
    notify({ loading: true });
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
      await response.json();
      notify();
    } catch (error) {
      notify({ type: 'defaultError' });
      console.log(error);
    } finally {
      setLoadingCursor(false);
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

  const handleStringArrayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditState((prev) => ({ ...prev, newStringItem: e.target.value }));
  };

  const handleStringArrayKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && editState.newStringItem.trim()) {
      setEditState((prev) => ({
        ...prev,
        inputValue: [
          ...(Array.isArray(prev.inputValue) ? prev.inputValue : []),
          prev.newStringItem.trim()
        ],
        newStringItem: ''
      }));
    }
  };

  const removeStringItem = (itemToRemove: string) => {
    setEditState((prev) => ({
      ...prev,
      inputValue: Array.isArray(prev.inputValue)
        ? prev.inputValue.filter((item) => item !== itemToRemove)
        : prev.inputValue
    }));
  };

  const handleDateChange = (date: Date | null) => {
    setEditState((prev) => ({ ...prev, inputValue: date }));
  };

  const typeTextData = () => (
    <Box
      p='12px'
      mb='12px'
      style={{
        position: 'relative',
        borderRadius: '8px',
        backgroundColor:
          textHover && !editState.showInput ? '#f8f9fa' : 'transparent',
        border: '1px solid #e9ecef',
        transition: 'all 0.2s ease',
        cursor: 'pointer',
        ...style
      }}
      c='white'
      onMouseEnter={() => setTextHover(true)}
      onMouseLeave={() => setTextHover(false)}
    >
      <Flex align='center' gap='12px' style={{ paddingRight: '32px' }}>
        {title && (
          <Text
            fw={600}
            size='sm'
            c={textHover && !editState.showInput ? 'black' : 'white'}
            style={{ minWidth: 'fit-content' }}
          >
            {title}:
          </Text>
        )}
        {editState.showInput ? (
          <Input
            flex={1}
            onChange={handleInputChange}
            value={
              typeof editState.inputValue === 'string'
                ? editState.inputValue
                : ''
            }
            size='sm'
          />
        ) : (
          <Text flex={1} size='sm' c={textHover ? 'black' : 'white'}>
            {typeof editState.inputValue === 'string'
              ? editState.inputValue
              : ''}
          </Text>
        )}
        {editState.showInput && (
          <CheckIcon
            cursor='pointer'
            size={18}
            color='green'
            onClick={() => toggleEdit('showInput', 'save')}
            style={{
              position: 'absolute',
              right: '12px',
              top: '50%',
              transform: 'translateY(-50%)'
            }}
          />
        )}
      </Flex>
      {!editState.showInput && (
        <div
          style={{
            display: textHover ? 'flex' : 'none',
            alignItems: 'center',
            justifyContent: 'center',
            width: '24px',
            height: '24px',
            position: 'absolute',
            right: '12px',
            top: '50%',
            transform: 'translateY(-50%)'
          }}
        >
          <IconEdit
            cursor='pointer'
            size={14}
            color='black'
            onClick={() => toggleEdit('showInput', 'open')}
          />
        </div>
      )}
    </Box>
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
          editState.inputValue.length > 0 ? (
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
            ))
          ) : (
            <Text c='dimmed' fs='italic'>
              {property === 'required'
                ? 'No hay géneros requeridos'
                : 'No hay géneros prohibidos'}
            </Text>
          )}
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
                <div style={{ width: '190px', flexShrink: 0 }}>
                  <Text style={{ margin: 0 }}>{genre.genre}</Text>
                </div>
                <Rating
                  value={genre.value}
                  onChange={(e) => rateGenre(e as any, i)}
                />
              </Flex>
            ))}
        </>
      ) : (
        <>
          <Flex mt='2rem' gap='8px' align='center'>
            <Text fw='600'>Editar Géneros</Text>
            <IconEdit
              size='22'
              onClick={() => toggleEdit('showEditableRating', 'open')}
            />
          </Flex>
          <Box>
            {Array.isArray(editState.inputValue) &&
              editState.inputValue
                .filter((item) => item.value !== 0)
                .map((genre, i) => (
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
                    <div style={{ width: '190px', flexShrink: 0 }}>
                      <p
                        style={{
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          margin: 0
                        }}
                      >
                        {genre.genre}
                      </p>
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        flexShrink: 0
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
      <Box
        p='12px'
        mb='12px'
        style={{
          position: 'relative',
          borderRadius: '8px',
          backgroundColor: 'transparent',
          border: '1px solid #e9ecef',
          transition: 'all 0.2s ease',
          cursor: 'pointer',
          minHeight: '48px'
        }}
        //  onMouseEnter={() => setTextareaHover(true)}
        //onMouseLeave={() => setTextareaHover(false)}
      >
        <Flex direction='column' gap='8px' style={{ paddingRight: '32px' }}>
          {title && (
            <Text fw={600} size='sm' c='dimmed'>
              {title}:
            </Text>
          )}
          {editState.showInput ? (
            <>
              <Textarea
                value={
                  typeof editState.inputValue === 'string'
                    ? editState.inputValue
                    : ''
                }
                onChange={handleInputChange}
                minRows={4}
                size='sm'
                style={{ marginBottom: '8px' }}
              />
            </>
          ) : (
            <>
              <Text size='sm' c='white' style={{ whiteSpace: 'pre-wrap' }}>
                {typeof editState.inputValue === 'string'
                  ? editState.inputValue
                  : ''}
              </Text>
            </>
          )}
        </Flex>
        {editState.showInput && (
          <CheckIcon
            cursor='pointer'
            size={18}
            color='green'
            onClick={() => toggleEdit('showInput', 'save')}
            style={{
              position: 'absolute',
              right: '12px',
              top: '12px'
            }}
          />
        )}
        {!editState.showInput && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '24px',
              height: '24px',
              borderRadius: '4px',
              backgroundColor: '#495057',
              transition: 'opacity 0.2s ease',
              position: 'absolute',
              right: '12px',
              top: '12px'
            }}
          >
            <IconEdit
              cursor='pointer'
              size={14}
              color='white'
              onClick={() => toggleEdit('showInput', 'open')}
            />
          </div>
        )}
      </Box>
    );
  };

  const typeDateData = () => (
    <Box
      p='12px'
      mb='12px'
      style={{
        position: 'relative',
        borderRadius: '8px',
        backgroundColor:
          textHover && !editState.showEditableDate ? '#f8f9fa' : 'transparent',
        border: '1px solid #e9ecef',
        transition: 'all 0.2s ease',
        cursor: 'pointer'
      }}
      c='white'
      onMouseEnter={() => setTextHover(true)}
      onMouseLeave={() => setTextHover(false)}
    >
      <Flex align='center' gap='12px' style={{ paddingRight: '32px' }}>
        {title && (
          <Text
            fw={600}
            size='sm'
            c={textHover && !editState.showEditableDate ? 'black' : 'white'}
            style={{ minWidth: 'fit-content' }}
          >
            {title}:
          </Text>
        )}
        {editState.showEditableDate ? (
          <DateTimePicker
            value={
              editState.inputValue instanceof Date ? editState.inputValue : null
            }
            onChange={(value) => handleDateChange(value ? new Date(value) : null)}
            size='sm'
            style={{ flex: 1 }}
          />
        ) : (
          <Text flex={1} size='sm' c={textHover ? 'black' : 'white'}>
            {editState.inputValue instanceof Date
              ? `${editState.inputValue.toLocaleDateString()} - ${editState.inputValue.toLocaleTimeString()}`
              : typeof editState.inputValue === 'string'
              ? editState.inputValue
              : ''}
          </Text>
        )}
        {editState.showEditableDate && (
          <CheckIcon
            cursor='pointer'
            size={18}
            color='green'
            onClick={() => toggleEdit('showEditableDate', 'save')}
            style={{
              position: 'absolute',
              right: '12px',
              top: '50%',
              transform: 'translateY(-50%)'
            }}
          />
        )}
      </Flex>
      {!editState.showEditableDate && (
        <div
          style={{
            display: textHover ? 'flex' : 'none',
            alignItems: 'center',
            justifyContent: 'center',
            width: '24px',
            height: '24px',
            position: 'absolute',
            right: '12px',
            top: '50%',
            transform: 'translateY(-50%)'
          }}
        >
          <IconEdit
            cursor='pointer'
            size={14}
            color='black'
            onClick={() => toggleEdit('showEditableDate', 'open')}
          />
        </div>
      )}
    </Box>
  );

  const typeStringArrayData = () => (
    <Box
      p='12px'
      mb='12px'
      style={{
        position: 'relative',
        borderRadius: '8px',
        backgroundColor: 'transparent',
        border: '1px solid #e9ecef',
        transition: 'all 0.2s ease'
      }}
    >
      <Flex direction='column' gap='8px'>
        {title && (
          <Text fw={600} size='sm' c='dimmed'>
            {title}:
          </Text>
        )}

        {editState.showEditableStringArray && (
          <Flex gap='8px' mb='12px'>
            <Input
              flex={1}
              value={editState.newStringItem}
              onChange={handleStringArrayChange}
              onKeyDown={handleStringArrayKeyDown}
              placeholder={`Agregar ${title?.toLowerCase() || 'elemento'}`}
              size='sm'
            />
            <IconPlus
              cursor='pointer'
              size={20}
              color='green'
              onClick={() => {
                if (editState.newStringItem.trim()) {
                  setEditState((prev) => ({
                    ...prev,
                    inputValue: [
                      ...(Array.isArray(prev.inputValue)
                        ? prev.inputValue
                        : []),
                      prev.newStringItem.trim()
                    ],
                    newStringItem: ''
                  }));
                }
              }}
            />
          </Flex>
        )}

        <Box>
          {Array.isArray(editState.inputValue) &&
          editState.inputValue.length > 0 ? (
            editState.inputValue.map((item, index) => (
              <Flex
                key={`${item}-${index}`}
                align='center'
                justify='space-between'
                p='8px'
                mb='4px'
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '4px',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}
              >
                <Text
                  size='sm'
                  c='white'
                  style={{ flex: 1, paddingRight: '8px' }}
                >
                  {item}
                </Text>
                {editState.showEditableStringArray && (
                  <IconX
                    cursor='pointer'
                    size={16}
                    color='red'
                    onClick={() => removeStringItem(item)}
                  />
                )}
              </Flex>
            ))
          ) : (
            <Text c='dimmed' fs='italic' size='sm'>
              No hay elementos agregados
            </Text>
          )}
        </Box>
      </Flex>

      {editState.showEditableStringArray ? (
        <CheckIcon
          cursor='pointer'
          size={18}
          color='green'
          onClick={() => toggleEdit('showEditableStringArray', 'save')}
          style={{
            position: 'absolute',
            right: '12px',
            top: '12px'
          }}
        />
      ) : (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '24px',
            height: '24px',
            borderRadius: '4px',
            backgroundColor: '#495057',
            transition: 'opacity 0.2s ease',
            position: 'absolute',
            right: '12px',
            top: '12px'
          }}
        >
          <IconEdit
            cursor='pointer'
            size={14}
            color='white'
            onClick={() => toggleEdit('showEditableStringArray', 'open')}
          />
        </div>
      )}
    </Box>
  );

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
      ) : type === 'date' ? (
        typeDateData()
      ) : type === 'stringArray' ? (
        typeStringArrayData()
      ) : (
        <></>
      )}
    </>
  );
};

export default EditableData;

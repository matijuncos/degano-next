import { useDeganoCtx } from '@/context/DeganoContext';
import {
  Box,
  CheckIcon,
  CloseIcon,
  Flex,
  Input,
  Text,
  Textarea,
  Group,
  UnstyledButton
} from '@mantine/core';
import { DateTimePicker, DatePickerInput, DateValue, TimePicker } from '@mantine/dates';
import {
  IconEdit,
  IconStar,
  IconStarFilled,
  IconPlus,
  IconX
} from '@tabler/icons-react';
import { cloneDeep, isEqual } from 'lodash';
import React, { useState, useEffect } from 'react';
import useLoadingCursor from '@/hooks/useLoadingCursor';
import useNotification from '@/hooks/useNotification';

const EditableData = ({
  title,
  value,
  property,
  type,
  style,
  onSave,
  disabled = false
}: {
  title?: string;
  value: string | any[] | Date | null;
  property: string;
  type: string;
  style?: React.CSSProperties;
  onSave?: (value: any) => void;
  disabled?: boolean;
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
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  // Detectar dispositivo táctil
  useEffect(() => {
    setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

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

  const setNestedProperty = (obj: any, path: string, value: any) => {
    // Handle both dot notation and bracket notation
    // e.g., "extraClients.0.fullName" or "timing[0].time"
    const pathParts = path
      .replace(/\[(\d+)\]/g, '.$1') // Convert brackets to dots: timing[0] -> timing.0
      .split('.')
      .filter(Boolean);

    let current = obj;
    for (let i = 0; i < pathParts.length - 1; i++) {
      const part = pathParts[i];
      if (!(part in current)) {
        current[part] = {};
      }
      current = current[part];
    }
    current[pathParts[pathParts.length - 1]] = value;
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
        // Handle nested properties like "extraClients.0.fullName" or "timing[0].time"
        if (property.includes('.') || property.includes('[')) {
          setNestedProperty(eventCopy, property, editState.inputValue);
        } else if (property in eventCopy) {
          eventCopy[property] = editState.inputValue;
        }
      }
    }
    if (action === 'save') {
      if (onSave) {
        onSave(editState.inputValue);
      } else {
        updateEvent(eventCopy);
      }
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

  const handleDateChange = (val: Date | null) => {
    setEditState((prev) => ({ ...prev, inputValue: val }));
  };

  const typeTextData = () => (
    <Box
      py='4px'
      mb='4px'
      style={{
        position: 'relative',
        backgroundColor:
          textHover && !editState.showInput
            ? 'rgba(64, 192, 87, 0.25)'
            : 'transparent',
        border:
          textHover && !editState.showInput
            ? '1px solid rgba(64, 192, 87, 0.5)'
            : '1px solid transparent',
        borderBottom:
          textHover && !editState.showInput
            ? '1px solid rgba(64, 192, 87, 0.3)'
            : '1px solid rgba(255, 255, 255, 0.05)',
        transition: 'all 0.2s ease',
        cursor: 'pointer',
        ...style
      }}
      c='white'
      onMouseEnter={() => setTextHover(true)}
      onMouseLeave={() => setTextHover(false)}
    >
      <Flex align='center' gap='8px'>
        {title && (
          <Text
            fw={600}
            size='sm'
            c='white'
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
          <Text flex={1} size='sm' c='white'>
            {typeof editState.inputValue === 'string'
              ? editState.inputValue
              : ''}
          </Text>
        )}
        {editState.showInput && (
          <>
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
            <CloseIcon
              cursor='pointer'
              size={'18'}
              color='red'
              onClick={() => toggleEdit('showInput', 'cancel')}
              style={{
                position: 'absolute',
                right: '40px',
                top: '50%',
                transform: 'translateY(-50%)'
              }}
            />
          </>
        )}
      </Flex>
      {!editState.showInput && !disabled && (
        <div
          style={{
            display: (textHover || isTouchDevice) ? 'flex' : 'none',
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
            color='white'
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
      <Flex justify='space-between' style={{marginBottom: '10px'}}>
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
          !disabled && (
            <IconEdit
              cursor='pointer'
              style={{ marginLeft: '12px' }}
              size={22}
              onClick={() => toggleEdit('showEditableChips', 'open')}
            />
          )
        )}
      </Flex>
    </>
  );

  const typeRatingData = () => {
    const options = [
      { label: 'Mucho', value: 4, color: '#51cf66' },     // Green
      { label: 'Normal', value: 3, color: '#ffd43b' },    // Yellow
      { label: 'Poco', value: 2, color: '#fd7e14' },      // Orange
      { label: 'Nada', value: 1, color: '#fa5252' }       // Red
    ];

    return (
      <>
        {editState.showEditableRating ? (
          <>
            <CheckIcon
              color='green'
              size='22'
              cursor='pointer'
              onClick={() => toggleEdit('showEditableRating', 'save')}
            />
            {Array.isArray(editState.inputValue) &&
              editState.inputValue.map((genre, i) => (
                <Flex
                  gap='12px'
                  key={genre + i}
                  align='flex-start'
                  py='10px'
                  style={{
                    borderBottom: 'solid 1px white'
                  }}
                >
                  <div
                    style={{ width: '190px', flexShrink: 0, paddingTop: '6px' }}
                  >
                    <Text style={{ margin: 0, fontWeight: 500 }}>
                      {genre.genre}
                    </Text>
                  </div>
                  <Flex gap='sm'>
                    {options.map((option) => (
                      <Flex
                        key={option.value}
                        direction='column'
                        align='center'
                        gap='4px'
                        style={{ maxWidth: '70px' }}
                      >
                        <UnstyledButton
                          onClick={() => rateGenre(option.value, i)}
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
                </Flex>
              ))}
          </>
        ) : (
          <>
            <Flex mt='2rem' gap='8px' align='center'>
              <Text fw='600'>Editar Géneros</Text>
              {!disabled && (
                <IconEdit
                  size='22'
                  cursor='pointer'
                  onClick={() => toggleEdit('showEditableRating', 'open')}
                />
              )}
            </Flex>
            <Box>
              {Array.isArray(editState.inputValue) &&
                editState.inputValue
                  .filter((item) => item.value !== 0)
                  .map((genre, i) => {
                    const selectedOption = options.find(
                      (o) => o.value === genre.value
                    );
                    return (
                      <div
                        key={`i${i}`}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
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
                            width: '30px',
                            height: '30px',
                            borderRadius: '50%',
                            backgroundColor:
                              selectedOption?.color || 'transparent',
                            border: `2px solid ${
                              selectedOption?.color || 'grey'
                            }`,
                            flexShrink: 0
                          }}
                          title={selectedOption?.label}
                        />
                        <Text size='sm' c='dimmed'>
                          {selectedOption?.label || ''}
                        </Text>
                      </div>
                    );
                  })}
            </Box>
          </>
        )}
      </>
    );
  };

  const typeTextArea = () => {
    return (
      <Box
        py='4px'
        mb='4px'
        style={{
          position: 'relative',
          backgroundColor: 'transparent',
          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
          transition: 'all 0.2s ease',
          cursor: 'pointer',
          minHeight: '48px'
        }}
        //  onMouseEnter={() => setTextareaHover(true)}
        //onMouseLeave={() => setTextareaHover(false)}
      >
        <Flex direction='column' gap='4px'>
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
              top: '8px'
            }}
          />
        )}
        {!editState.showInput && !disabled && (
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
              top: '8px'
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
      py='4px'
      mb='4px'
      style={{
        position: 'relative',
        backgroundColor:
          textHover && !editState.showEditableDate
            ? 'rgba(64, 192, 87, 0.25)'
            : 'transparent',
        border:
          textHover && !editState.showEditableDate
            ? '1px solid rgba(64, 192, 87, 0.5)'
            : '1px solid transparent',
        borderBottom:
          textHover && !editState.showEditableDate
            ? '1px solid rgba(64, 192, 87, 0.3)'
            : '1px solid rgba(255, 255, 255, 0.05)',
        transition: 'all 0.2s ease',
        cursor: 'pointer'
      }}
      c='white'
      onMouseEnter={() => setTextHover(true)}
      onMouseLeave={() => setTextHover(false)}
    >
      <Flex align='center' gap='8px'>
        {title && (
          <Text
            fw={600}
            size='sm'
            c='white'
            style={{ minWidth: 'fit-content' }}
          >
            {title}:
          </Text>
        )}
        {editState.showEditableDate ? (
          <DateTimePicker
            value={
              editState.inputValue instanceof Date
                ? editState.inputValue.toISOString()
                : null
            }
            onChange={(value) =>
              handleDateChange(value ? new Date(value) : null)
            }
            size='sm'
            style={{ flex: 1 }}
          />
        ) : (
          <Text flex={1} size='sm' c='white'>
            {editState.inputValue instanceof Date
              ? `${editState.inputValue.toLocaleDateString()} - ${editState.inputValue.toLocaleTimeString()}`
              : typeof editState.inputValue === 'string'
              ? editState.inputValue
              : ''}
          </Text>
        )}
        {editState.showEditableDate && (
          <>
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
            <CloseIcon
              cursor='pointer'
              size={'18'}
              color='red'
              onClick={() => toggleEdit('showEditableDate', 'cancel')}
              style={{
                position: 'absolute',
                right: '40px',
                top: '50%',
                transform: 'translateY(-50%)'
              }}
            />
          </>
        )}
      </Flex>
      {!editState.showEditableDate && !disabled && (
        <div
          style={{
            display: (textHover || isTouchDevice) ? 'flex' : 'none',
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
            color='white'
            onClick={() => toggleEdit('showEditableDate', 'open')}
          />
        </div>
      )}
    </Box>
  );

  const typeStringArrayData = () => (
    <Box
      py='4px'
      mb='8px'
      style={{
        position: 'relative',
        backgroundColor: 'transparent',
        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
        transition: 'all 0.2s ease'
      }}
    >
      <Flex direction='column' gap='4px'>
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
          {(() => {
            const inputArray = Array.isArray(editState.inputValue)
              ? editState.inputValue
              : [];
            return inputArray.length > 0 ? (
              inputArray.map((item, index) => (
                <Flex
                  key={`${item}-${index}`}
                  align='center'
                  justify='space-between'
                  py='4px'
                  mb='2px'
                  style={{
                    backgroundColor: 'transparent',
                    borderBottom:
                      index < inputArray.length - 1
                        ? '1px solid rgba(255, 255, 255, 0.03)'
                        : 'none'
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
            );
          })()}
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
        !disabled && (
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
        )
      )}
    </Box>
  );

  const typeDateOnlyData = () => (
    <Box
      py='4px'
      mb='4px'
      style={{
        position: 'relative',
        backgroundColor:
          textHover && !editState.showEditableDate
            ? 'rgba(64, 192, 87, 0.25)'
            : 'transparent',
        border:
          textHover && !editState.showEditableDate
            ? '1px solid rgba(64, 192, 87, 0.5)'
            : '1px solid transparent',
        borderBottom:
          textHover && !editState.showEditableDate
            ? '1px solid rgba(64, 192, 87, 0.3)'
            : '1px solid rgba(255, 255, 255, 0.05)',
        transition: 'all 0.2s ease',
        cursor: 'pointer'
      }}
      c='white'
      onMouseEnter={() => setTextHover(true)}
      onMouseLeave={() => setTextHover(false)}
    >
      <Flex align='center' gap='8px'>
        {title && (
          <Text
            fw={600}
            size='sm'
            c='white'
            style={{ whiteSpace: 'nowrap' }}
          >
            {title}:
          </Text>
        )}
        {editState.showEditableDate ? (
          <DatePickerInput
            placeholder='Seleccionar fecha'
            locale='es'
            valueFormat='DD/MM/YYYY'
            value={editState.inputValue as DateValue}
            onChange={(value) => setEditState((prev) => ({ ...prev, inputValue: value }))}
            size='sm'
            style={{ flex: 1 }}
          />
        ) : (
          <Text flex={1} size='sm' c='white'>
            {editState.inputValue && editState.inputValue instanceof Date
              ? editState.inputValue.toLocaleDateString('es-AR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric'
                })
              : value && typeof value === 'string' ? value : 'Sin fecha'}
          </Text>
        )}
        {editState.showEditableDate && (
          <>
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
            <CloseIcon
              cursor='pointer'
              size={'18'}
              color='red'
              onClick={() => toggleEdit('showEditableDate', 'cancel')}
              style={{
                position: 'absolute',
                right: '40px',
                top: '50%',
                transform: 'translateY(-50%)'
              }}
            />
          </>
        )}
      </Flex>
      {!editState.showEditableDate && !disabled && (
        <div
          style={{
            display: (textHover || isTouchDevice) ? 'flex' : 'none',
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
            size={18}
            onClick={() => toggleEdit('showEditableDate', 'open')}
          />
        </div>
      )}
    </Box>
  );

  const typeTimeOnlyData = () => (
    <Box
      py='4px'
      mb='4px'
      style={{
        position: 'relative',
        backgroundColor:
          textHover && !editState.showInput
            ? 'rgba(64, 192, 87, 0.25)'
            : 'transparent',
        border:
          textHover && !editState.showInput
            ? '1px solid rgba(64, 192, 87, 0.5)'
            : '1px solid transparent',
        borderBottom:
          textHover && !editState.showInput
            ? '1px solid rgba(64, 192, 87, 0.3)'
            : '1px solid rgba(255, 255, 255, 0.05)',
        transition: 'all 0.2s ease',
        cursor: 'pointer'
      }}
      c='white'
      onMouseEnter={() => setTextHover(true)}
      onMouseLeave={() => setTextHover(false)}
    >
      <Flex align='center' gap='8px'>
        {title && (
          <Text
            fw={600}
            size='sm'
            c='white'
            style={{ whiteSpace: 'nowrap' }}
          >
            {title}:
          </Text>
        )}
        {editState.showInput ? (
          <TimePicker
            value={editState.inputValue as string}
            onChange={(value: string) => setEditState((prev) => ({ ...prev, inputValue: value }))}
            size='sm'
            style={{ flex: 1 }}
          />
        ) : (
          <Text flex={1} size='sm' c='white'>
            {typeof editState.inputValue === 'string'
              ? editState.inputValue
              : (typeof value === 'string' ? value : 'Sin hora')}
          </Text>
        )}
        {editState.showInput && (
          <>
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
            <CloseIcon
              cursor='pointer'
              size={'18'}
              color='red'
              onClick={() => toggleEdit('showInput', 'cancel')}
              style={{
                position: 'absolute',
                right: '40px',
                top: '50%',
                transform: 'translateY(-50%)'
              }}
            />
          </>
        )}
      </Flex>
      {!editState.showInput && !disabled && (
        <div
          style={{
            display: (textHover || isTouchDevice) ? 'flex' : 'none',
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
            size={18}
            onClick={() => toggleEdit('showInput', 'open')}
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
      ) : type === 'dateOnly' ? (
        typeDateOnlyData()
      ) : type === 'timeOnly' ? (
        typeTimeOnlyData()
      ) : type === 'stringArray' ? (
        typeStringArrayData()
      ) : (
        <></>
      )}
    </>
  );
};

export default EditableData;

import { useDeganoCtx } from '@/context/DeganoContext';
import { Equipment } from '@/context/types';
import {
  CheckIcon,
  CloseIcon,
  Flex,
  Input,
  TableTd,
  TableTr
} from '@mantine/core';
import { cloneDeep, concat } from 'lodash';
import React, { useState } from 'react';

const RowWithInputs = ({ hideRow }: { hideRow: Function }) => {
  const { selectedEvent, setLoading, setSelectedEvent } = useDeganoCtx();
  const [newEquipment, setNewEquipment] = useState<Equipment>({
    name: '',
    quantity: 0,
    price: 0
  });
  const onChangeHandler = (e: any) => {
    setNewEquipment({
      ...newEquipment,
      [e.target.name]: e.target.value
    });
  };

  const addNewEquipment = () => {
    const eventClone = cloneDeep(selectedEvent);
    const newEquipmentToSave = concat(eventClone?.equipment, newEquipment);
    makePutRequest(newEquipmentToSave as Equipment[]);
  };

  const makePutRequest = async (newEquipment: Equipment[]) => {
    const event = cloneDeep(selectedEvent);
    event!.equipment = newEquipment;
    try {
      const response = await fetch(`/api/updateEvent`, {
        method: 'PUT',
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(event)
      });
      const data = await response.json();
      setSelectedEvent(data.event);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <TableTr>
      <TableTd>
        <Input onChange={onChangeHandler} name='name' />
      </TableTd>
      <TableTd>
        <Input onChange={onChangeHandler} name='quantity' />
      </TableTd>
      <TableTd>
        <Input onChange={onChangeHandler} name='price' />
      </TableTd>
      <TableTd>
        <Flex align='center' gap='24px'>
          <CheckIcon onClick={addNewEquipment} size={20} />
          <CloseIcon onClick={() => hideRow()} size='24' />
        </Flex>
      </TableTd>
    </TableTr>
  );
};

export default RowWithInputs;

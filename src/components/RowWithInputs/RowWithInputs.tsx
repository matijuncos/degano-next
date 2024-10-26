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
import { NewEquipment } from '../equipmentStockTable/types';
import useNotification from '@/hooks/useNotification';

const RowWithInputs = ({ hideRow }: { hideRow: Function }) => {
  const { selectedEvent, setLoading, setSelectedEvent } = useDeganoCtx();
  const notify = useNotification();
  const [newEquipment, setNewEquipment] = useState<NewEquipment>({
    name: '',
    selectedQuantity: 0,
    price: 0,
    currentQuantity: 0,
    totalQuantity: 0,
    _id: new Date().toISOString()
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
    makePutRequest(newEquipmentToSave as NewEquipment[]);
  };

  const makePutRequest = async (newEquipment: NewEquipment[]) => {
    const event = cloneDeep(selectedEvent);
    event!.equipment = newEquipment;
    notify({loading: true});
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
      notify({message: 'Se actualizo el evento correctamente'});
      setSelectedEvent(data.event);
    } catch (error) {
      notify({type: 'defaultError'});
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
        <Input onChange={onChangeHandler} name='selectedQuantity' />
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

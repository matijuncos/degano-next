import React, { useState } from 'react';
import { TableTr, TableTd, Flex, Input, Modal, Button } from '@mantine/core';
import {
  IconAlertTriangle,
  IconCheck,
  IconEdit,
  IconTrash
} from '@tabler/icons-react';
import CustomCell from '../CustomCell/CustomCell';
import { cloneDeep } from 'lodash';
import { useDeganoCtx } from '@/context/DeganoContext';
import { NewEquipment } from '../equipmentStockTable/types';
import { useUser } from '@auth0/nextjs-auth0/client';
import useNotification from '@/hooks/useNotification';

interface CustomRowProps {
  eq: NewEquipment;
  index: number;
  setEquipmentListToEdit: React.Dispatch<React.SetStateAction<NewEquipment[]>>;
  equipmentListToEdit: NewEquipment[];
}

const CustomRow: React.FC<CustomRowProps> = ({
  eq,
  index,
  equipmentListToEdit,
  setEquipmentListToEdit
}) => {
  const { user } = useUser();
  const [isEditing, setIsEditing] = useState(false);
  const [isConfirmationOpen, setIsconfirmationOpen] = useState(false);
  const { selectedEvent, setSelectedEvent, setLoading } = useDeganoCtx();
  const notify = useNotification();
  const handleChange = (field: keyof NewEquipment, value: string | number) => {
    setEquipmentListToEdit((prev) =>
      prev.map((item, idx) =>
        idx === index ? { ...item, [field]: value } : item
      )
    );
  };

  const handleClickEdit = () => {
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    setIsEditing(false);
    setLoading(true);
    makePutRequest(equipmentListToEdit);
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

  const handleRemoveRow = () => {
    setIsconfirmationOpen(true);
  };
  const deleteRowHandler = () => {
    const equipmentCopy = cloneDeep(equipmentListToEdit);
    const filteredEquipment = equipmentCopy.filter(
      (item, idx) => idx !== index
    );
    setEquipmentListToEdit(filteredEquipment);
    makePutRequest(filteredEquipment);
  };

  return (
    <>
      <Modal
        opened={isConfirmationOpen}
        onClose={() => setIsconfirmationOpen(false)}
        title='Estás por eliminar un item. Seguro?'
      >
        <Flex direction='column' align='center' gap='16px'>
          <IconAlertTriangle size={80} />
          <Button
            w='100%'
            variant='gradient'
            onClick={() => deleteRowHandler()}
          >
            Confirmar
          </Button>
        </Flex>
      </Modal>
      <TableTr>
        <CustomCell
          field='name'
          value={eq.name}
          isEditing={isEditing}
          handleChange={handleChange}
        />
        <CustomCell
          field='selectedQuantity'
          value={eq.selectedQuantity || ''}
          isEditing={isEditing}
          handleChange={handleChange}
          color={
            Number(eq.currentQuantity) >= Number(eq.selectedQuantity) ||
            !eq.currentQuantity
              ? 'green'
              : 'red'
          }
        />
        <CustomCell
          field='price'
          value={user?.role === 'admin' ? eq.price : '****'}
          isEditing={isEditing}
          handleChange={handleChange}
        />
        <TableTd>
          {user?.role === 'admin'
            ? Number(eq.price) * Number(eq.selectedQuantity)
            : '****'}
        </TableTd>
        <TableTd>
          <Flex align='center' gap='24px'>
            {isEditing ? (
              <IconCheck onClick={handleSaveEdit} />
            ) : (
              <>
                <IconEdit onClick={handleClickEdit} />
                <IconTrash color='red' onClick={handleRemoveRow} />
              </>
            )}
          </Flex>
        </TableTd>
      </TableTr>
    </>
  );
};

export default CustomRow;

import React, { useState } from 'react';
import { TableTr, TableTd, Flex, Input, Modal, Button } from '@mantine/core';
import {
  IconAlertTriangle,
  IconCheck,
  IconEdit,
  IconTrash
} from '@tabler/icons-react';
import { Equipment } from '@/context/types';
import CustomCell from '../CustomCell/CustomCell';
import { cloneDeep } from 'lodash';
import { useDeganoCtx } from '@/context/DeganoContext';

interface CustomRowProps {
  eq: Equipment;
  index: number;
  setEquipmentListToEdit: React.Dispatch<React.SetStateAction<Equipment[]>>;
  equipmentListToEdit: Equipment[];
}

const CustomRow: React.FC<CustomRowProps> = ({
  eq,
  index,
  equipmentListToEdit,
  setEquipmentListToEdit
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isConfirmationOpen, setIsconfirmationOpen] = useState(false);
  const { selectedEvent, setSelectedEvent, setLoading } = useDeganoCtx();
  const handleChange = (field: keyof Equipment, value: string | number) => {
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
          field='quantity'
          value={eq.quantity}
          isEditing={isEditing}
          handleChange={handleChange}
        />
        <CustomCell
          field='price'
          value={eq.price}
          isEditing={isEditing}
          handleChange={handleChange}
        />
        <TableTd>${Number(eq.price) * Number(eq.quantity)}</TableTd>
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

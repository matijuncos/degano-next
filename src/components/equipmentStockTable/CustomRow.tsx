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
import { NewEquipment } from './types';
import useNotification from '@/hooks/useNotification';

interface CustomRowProps {
  eq: NewEquipment;
  index: number;
  setEquipmentListToEdit: React.Dispatch<React.SetStateAction<NewEquipment[]>>;
  equipmentListToEdit: NewEquipment[];
  makePutRequest: (arg: NewEquipment) => Promise<any>;
}

const CustomRow: React.FC<CustomRowProps> = ({
  eq,
  index,
  equipmentListToEdit,
  setEquipmentListToEdit,
  makePutRequest
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isConfirmationOpen, setIsconfirmationOpen] = useState(false);
  const { setLoading } = useDeganoCtx();
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

  const handleSaveEdit = async (equipmentItem: NewEquipment) => {
    setIsEditing(false);
    setLoading(true);
    await makePutRequest(equipmentItem);
  };

  const handleRemoveRow = () => {
    setIsconfirmationOpen(true);
  };

  const deleteRowHandler = async () => {
    const equipmentCopy = cloneDeep(equipmentListToEdit);
    const filteredEquipment = equipmentCopy.filter(
      (_item, idx) => idx !== index
    );
    const equipmentToDelete = equipmentCopy.find((_item, idx) => idx === index);
    notify({ loading: true });
    try {
      const response = await fetch('/api/deleteEquipment', {
        method: 'DELETE',
        body: JSON.stringify({ equipment: equipmentToDelete }),
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      notify({ message: 'Se elimino con exito el equipo' });
      setEquipmentListToEdit(filteredEquipment);
      setIsconfirmationOpen(false);
      return await response.json();
    } catch (error) {
      notify({ type: 'defaultError' });
      console.error('Error en la solicitud DELETE:', error);
      throw error;
    }
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
        {/* <CustomCell
          field='totalQuantity'
          value={eq.totalQuantity || ''}
          isEditing={isEditing}
          handleChange={handleChange}
        />
        <CustomCell
          field='currentQuantity'
          value={eq.currentQuantity || ''}
          isEditing={isEditing}
          handleChange={handleChange}
        />
        <CustomCell
          field='price'
          value={eq.price || ''}
          isEditing={isEditing}
          handleChange={handleChange}
        /> */}
        <CustomCell
          field='brand'
          value={eq.brand || ''}
          isEditing={isEditing}
          handleChange={handleChange}
        />
        {/* <CustomCell
          field='codeNumber'
          value={eq.codeNumber || ''}
          isEditing={isEditing}
          handleChange={handleChange}
        /> */}
        <CustomCell
          field='model'
          value={eq.model || ''}
          isEditing={isEditing}
          handleChange={handleChange}
        />
        {/* <CustomCell
          field='realPrice'
          value={eq.realPrice || ''}
          isEditing={isEditing}
          handleChange={handleChange}
        /> */}
        <TableTd>
          <Flex align='center' gap='24px'>
            {isEditing ? (
              <IconCheck
                onClick={() => handleSaveEdit(eq)}
                className='cursorPointer'
              />
            ) : (
              <>
                <IconEdit onClick={handleClickEdit} className='cursorPointer' />
                <IconTrash
                  color='red'
                  onClick={handleRemoveRow}
                  className='cursorPointer'
                />
              </>
            )}
          </Flex>
        </TableTd>
      </TableTr>
    </>
  );
};

export default CustomRow;

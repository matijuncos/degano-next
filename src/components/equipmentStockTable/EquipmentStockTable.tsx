'use client';
import {
  Input,
  Table,
  TableTbody,
  TableTd,
  TableTh,
  TableThead,
  TableTr
} from '@mantine/core';
import { IconCheck, IconPlus } from '@tabler/icons-react';
import React, { useState } from 'react';
import { columns } from './config';
import { NewEquipment } from './types';
import CustomRow from './CustomRow';
import useNotification from '@/hooks/useNotification';

const EquipmentStockTable = ({
  equipment,
}: {
  equipment: NewEquipment[] | undefined;
}) => {
  const [showInputsToAdd, setShowInputsToAdd] = useState(false);
  const [newEquipment, setNewEquipment] = useState({
    name: '',
    price: 0,
    totalQuantity: 0,
    currentQuantity: 0,
    brand: '',
    codeNumber: ''
  });
  const [equipmentList, setEquipmentList] = useState<NewEquipment[]>(
    equipment || []
  );
  const notify = useNotification();

  const handleChange = (
    field: keyof typeof newEquipment,
    value: string | number
  ) => {
    setNewEquipment({ ...newEquipment, [field]: value });
  };

  const handleAddEquipment = async (equipmentItem: NewEquipment) => {
    setShowInputsToAdd(false);
    const response = await makePutRequest(equipmentItem);
    if (response.status === 200) setEquipmentList([...equipmentList, newEquipment]);
    setNewEquipment({
      name: '',
      price: 0,
      totalQuantity: 0,
      currentQuantity: 0,
      brand: '',
      codeNumber: ''
    });
  };

  const makePutRequest = async (newEquipment: NewEquipment) => {
    notify({loading: true});
    try {
      const response = await fetch('/api/updateEquipmentV2', {
        method: 'PUT',
        body: JSON.stringify({equipment: newEquipment}),
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      notify();
      return await response.json();
    } catch (error) {
      notify({type: 'defaultError'});
      console.error("Error en la solicitud PUT:", error);
      throw error; // Puedes lanzar el error de nuevo si necesitas manejarlo en otro lugar
    }
  };

  return (
    <Table>
      <TableThead>
        <TableTr>
          {columns.map((col) => (
            <TableTh key={col.index}>{col.name}</TableTh>
          ))}
          <TableTh>Actions</TableTh>
          <TableTh>
            <IconPlus onClick={() => setShowInputsToAdd(!showInputsToAdd)} className='cursorPointer'/>
          </TableTh>
        </TableTr>
      </TableThead>

      <TableTbody>
        {showInputsToAdd && (
          <TableTr>
            {columns.map((col) => (
              <TableTd key={`new-${col.index}`}>
                <Input
                  value={newEquipment[col.index as keyof typeof newEquipment]}
                  onChange={(e) =>
                    handleChange(
                      col.index as keyof typeof newEquipment,
                      e.target.value
                    )
                  }
                />
              </TableTd>
            ))}
            <TableTd>
              <IconCheck color='green' onClick={() => handleAddEquipment(newEquipment)} className='cursorPointer'/>
            </TableTd>
          </TableTr>
        )}
        {equipmentList.map((row, idx) => (
          <CustomRow
            makePutRequest={makePutRequest}
            equipmentListToEdit={equipmentList}
            setEquipmentListToEdit={setEquipmentList}
            key={row._id || idx}
            eq={row}
            index={idx}
          />
        ))}
      </TableTbody>
    </Table>
  );
};

export default EquipmentStockTable;

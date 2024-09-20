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

const EquipmentStockTable = ({
  equipment,
  id
}: {
  equipment: NewEquipment[] | undefined;
  id: string;
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

  const handleChange = (
    field: keyof typeof newEquipment,
    value: string | number
  ) => {
    setNewEquipment({ ...newEquipment, [field]: value });
  };

  const handleAddEquipment = async () => {
    const payload = [
      ...equipmentList,
      { ...newEquipment, _id: new Date().toISOString() }
    ];
    setShowInputsToAdd(false);
    await makePutRequest(payload);

    setEquipmentList(payload);
    setNewEquipment({
      name: '',
      price: 0,
      totalQuantity: 0,
      currentQuantity: 0,
      brand: '',
      codeNumber: ''
    });
  };

  const makePutRequest = async (newEquipment: NewEquipment[]) => {
    const payload = {
      _id: id,
      equipment: newEquipment
    };
    const response = await fetch('/api/updateEquipmentV2', {
      method: 'PUT',
      body: JSON.stringify(payload),
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    return response.json();
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
            <IconPlus onClick={() => setShowInputsToAdd(!showInputsToAdd)} />
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
              <IconCheck color='green' onClick={handleAddEquipment} />
            </TableTd>
          </TableTr>
        )}
        {equipmentList.map((row, idx) => (
          <CustomRow
            makePutRequest={makePutRequest}
            equipmentListToEdit={equipmentList}
            setEquipmentListToEdit={setEquipmentList}
            key={row._id}
            eq={row}
            index={idx}
          />
        ))}
      </TableTbody>
    </Table>
  );
};

export default EquipmentStockTable;

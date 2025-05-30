'use client';
import {
  Accordion,
  AccordionControl,
  AccordionItem,
  AccordionPanel,
  Input,
  Table,
  TableTbody,
  TableTd,
  TableTh,
  TableThead,
  TableTr
} from '@mantine/core';
import { IconCheck, IconPlus } from '@tabler/icons-react';
import React, { useState, useMemo } from 'react';
import { columns } from './config';
import { NewEquipment } from './types';
import CustomRow from './CustomRow';
import useNotification from '@/hooks/useNotification';

const EquipmentStockTable = ({
  equipment
}: {
  equipment: NewEquipment[] | undefined;
}) => {
  const [showInputsToAdd, setShowInputsToAdd] = useState(false);
  const [newEquipment, setNewEquipment] = useState<NewEquipment>({
    name: '',
    price: 0,
    totalQuantity: 0,
    currentQuantity: 0,
    brand: '',
    codeNumber: '',
    model: '',
    realPrice: 0,
    type: 'No Definido'
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
    if (response.status === 200)
      setEquipmentList([...equipmentList, newEquipment]);
    setNewEquipment({
      name: '',
      price: 0,
      totalQuantity: 0,
      currentQuantity: 0,
      brand: '',
      codeNumber: '',
      model: '',
      realPrice: 0,
      type: 'No Definido'
    });
  };

  const makePutRequest = async (newEquipment: NewEquipment) => {
    notify({ loading: true });
    try {
      const response = await fetch('/api/updateEquipmentV2', {
        method: 'PUT',
        body: JSON.stringify({ equipment: newEquipment }),
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      notify();
      return await response.json();
    } catch (error) {
      notify({ type: 'defaultError' });
      console.error('Error en la solicitud PUT:', error);
      throw error; // Puedes lanzar el error de nuevo si necesitas manejarlo en otro lugar
    }
  };

  const groupedEquipment = useMemo(() => {
    return equipmentList.reduce((acc, eq) => {
      const type = eq.type || 'No Definido';
      if (!acc[type]) acc[type] = [];
      acc[type].push(eq);
      return acc;
    }, {} as Record<string, NewEquipment[]>);
  }, [equipmentList]);

  return (
    <>
      <div
        className='cursorPointer'
        style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}
        onClick={() => setShowInputsToAdd(!showInputsToAdd)}
      >
        <p>{!showInputsToAdd ? 'Nuevo Equipo' : 'Cancelar'}</p>
        <IconPlus/>
      </div>
      {showInputsToAdd && (
        <Table>
          <TableThead>
            <TableTr>
              {columns.map((col) => (
                <TableTh key={`new-${col.index}`}>{col.name}</TableTh>
              ))}
              <TableTh>Acciones</TableTh>
            </TableTr>
          </TableThead>

          <TableTbody>
            <TableTr>
              {columns.map((col) =>
                col.index === 'type' ? (
                  <TableTd key={`new-${col.index}`}>
                    <select
                      value={
                        newEquipment[col.index as keyof typeof newEquipment] ===
                        'No Definido'
                          ? ''
                          : newEquipment[col.index as keyof typeof newEquipment]
                      }
                      onChange={(e) =>
                        handleChange(
                          col.index as keyof NewEquipment,
                          e.target.value
                        )
                      }
                      style={{
                        width: '100%',
                        padding: '8px',
                        height: '45px',
                        boxSizing: 'border-box'
                      }}
                    >
                      <option value='' disabled>
                        Clasificación
                      </option>
                      {[
                        'Sonido',
                        'Iluminación',
                        'Imagen',
                        'Accesorios',
                        'No Definido'
                      ].map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </TableTd>
                ) : (
                  <TableTd key={`new-${col.index}`}>
                    <Input
                      value={
                        newEquipment[col.index as keyof typeof newEquipment]
                      }
                      onChange={(e) =>
                        handleChange(
                          col.index as keyof typeof newEquipment,
                          e.target.value
                        )
                      }
                    />
                  </TableTd>
                )
              )}
              <TableTd>
                <IconCheck
                  color='green'
                  onClick={() => handleAddEquipment(newEquipment)}
                  className='cursorPointer'
                />
              </TableTd>
            </TableTr>
          </TableTbody>
        </Table>
      )}
      <Accordion>
        {Object.keys(groupedEquipment).map((type) => (
          <AccordionItem key={type} value={type}>
            <AccordionControl>{type}</AccordionControl>
            <AccordionPanel>
              <Table>
                <TableThead>
                  <TableTr>
                    {columns.map(
                      (col) =>
                        col.index !== 'type' && (
                          <TableTh key={col.index}>{col.name}</TableTh>
                        )
                    )}
                    <TableTh>Actions</TableTh>
                  </TableTr>
                </TableThead>

                <TableTbody>
                  {groupedEquipment[type].map((row, idx) => (
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
            </AccordionPanel>
          </AccordionItem>
        ))}
      </Accordion>
    </>
  );
};

export default EquipmentStockTable;

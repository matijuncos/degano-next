import { useState } from 'react';
import {
  Box,
  Checkbox,
  Input,
  Table,
  TableTbody,
  TableTd,
  TableThead,
  TableTr,
  Text
} from '@mantine/core';
import { NewEquipment } from '../equipmentStockTable/types';
import { EventModel } from '@/context/types';
import { columns } from '../equipmentStockTable/config';
import { IconCheck, IconX } from '@tabler/icons-react';
import useNotification from '@/hooks/useNotification';

const ChoseComponentFromDBComponent = ({
  equipment,
  setEquipment,
  equipmentFromDB,
  setEquipmentFromDB,
  showInputsToAdd,
  setShowInputsToAdd
}: {
  equipment: EventModel;
  setEquipment: Function;
  equipmentFromDB: NewEquipment[];
  setEquipmentFromDB: Function;
  showInputsToAdd: Boolean,
  setShowInputsToAdd: Function
}) => {
  const [newEquipment, setNewEquipment] = useState({
    name: '',
    price: '',
    totalQuantity: '',
    currentQuantity: '',
    brand: '',
    codeNumber: ''
  });
  const notify = useNotification();

  const hasValidId = (item: { _id?: string }): item is { _id: string } => {
    return Boolean(item._id);
  };  

  const handleCheckEquipment = (value: NewEquipment) => {
    if (
      equipment.equipment.some(
        (item) => hasValidId(item) && hasValidId(value) && item._id.toString() === value._id.toString()
      )
    ) {
      setEquipment({
        ...equipment,
        equipment: equipment.equipment.filter(
          (item) => hasValidId(item) && hasValidId(value) && item._id.toString() !== value._id.toString()
        )
      });
    } else {
      setEquipment({
        ...equipment,
        equipment: [...equipment.equipment, value]
      });
    }
  };

  const handleQuantityChange = (id: string, quantity: number) => {
    setEquipment((prev: EventModel) => {
      return {
        ...prev,
        equipment: prev.equipment.map((item) =>
          hasValidId(item) &&
          item._id.toString() === id
            ? { ...item, selectedQuantity: quantity }
            : item
        )
      };
    });
  };

  const handleChange = (
    field: keyof typeof newEquipment,
    value: string | number
  ) => {
    setNewEquipment({ ...newEquipment, [field]: value });
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
      notify({message: 'Se creo el nuevo equipamiento correctamente'});
      return await response.json();
    } catch (error) {
      notify({type: 'defaultError'});
      console.error("Error en la solicitud PUT:", error);
      throw error;
    }
  };

  const handleAddEquipment = async (equipmentItem: typeof newEquipment) => {
    const formattedEquipment: NewEquipment = {
      name: equipmentItem.name,
      price: Number(equipmentItem.price),
      totalQuantity: Number(equipmentItem.totalQuantity),
      currentQuantity: Number(equipmentItem.currentQuantity),
      brand: equipmentItem.brand,
      codeNumber: equipmentItem.codeNumber
    };
    const response = await makePutRequest(formattedEquipment);
    if(response.status === 200) {      
      setEquipmentFromDB([...equipmentFromDB, newEquipment]);
      setShowInputsToAdd(false);
    }
    setNewEquipment({
      name: '',
      price: '',
      totalQuantity: '',
      currentQuantity: '',
      brand: '',
      codeNumber: ''
    });
  };

  return (
    <>
      <Box>
        <Table>
          <TableThead>
            <TableTr>
              <TableTd></TableTd>
              <TableTd>Nombre</TableTd>
              {equipment.equipment.length > 0 && <TableTd>Cantidad</TableTd>}
              <TableTd>Cantidad disponible</TableTd>
            </TableTr>
          </TableThead>
          <TableTbody>
            {(equipmentFromDB as NewEquipment[])?.map((eq, idx) => {
              const selectedItem = equipment.equipment.find(
                (item) => hasValidId(item) && hasValidId(eq) && item._id.toString() === eq._id.toString()
              );

              return (
                <TableTr key={eq._id || idx}>
                  <TableTd>
                    <Checkbox
                      checked={Boolean(selectedItem)}
                      onChange={() => handleCheckEquipment(eq)}
                      className='cursorPointer'
                    />
                  </TableTd>
                  <TableTd>{eq.name}</TableTd>
                  {equipment.equipment.length > 0 && (
                    <TableTd>
                      {Boolean(selectedItem) && (
                        <Input
                          type='number'
                          placeholder='cuantos llevas?'
                          value={selectedItem?.selectedQuantity}
                          onChange={(e) =>
                            hasValidId(eq) && 
                            handleQuantityChange(
                              eq._id.toString(),
                              Number(e.target.value)
                            )
                          }
                          min={1}
                        />
                      )}
                    </TableTd>
                  )}
                  <TableTd>
                    <Text
                      c={
                        Number(eq.currentQuantity) -
                          Number(selectedItem?.selectedQuantity || 0) >=
                        0
                          ? 'green'
                          : 'red'
                      }
                    >
                      {Number(eq.currentQuantity) -
                        Number(selectedItem?.selectedQuantity || 0)}
                    </Text>
                  </TableTd>
                  <TableTd></TableTd>
                </TableTr>
              );
            })}
            {showInputsToAdd && (
              <TableTr>
                {columns.map((col) => (
                  <TableTd key={`new-${col.index}`}>
                    <Input
                      value={newEquipment[col.index as keyof typeof newEquipment]}
                      placeholder={col.name}
                      onChange={(e) =>
                        handleChange(
                          col.index as keyof typeof newEquipment,
                          e.target.value
                        )
                      }
                    />
                  </TableTd>
                ))}
                <TableTd style={{verticalAlign: 'bottom'}}>
                  <IconCheck color='green' onClick={() => handleAddEquipment(newEquipment)} className='cursorPointer' style={{marginRight: '5px'}}/>
                  <IconX color='red' onClick={() => setShowInputsToAdd(false)} className='cursorPointer' />
                </TableTd>
              </TableTr>
            )}
          </TableTbody>
        </Table>
      </Box>
    </>
  );
};

export default ChoseComponentFromDBComponent;

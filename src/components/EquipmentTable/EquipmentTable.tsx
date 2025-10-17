import { useDeganoCtx } from '@/context/DeganoContext';
import {
  Table,
  TableTbody,
  TableTd,
  TableTh,
  TableThead,
  TableTr
} from '@mantine/core';
import React, { useEffect, useState } from 'react';
import CustomRow from '../EquipmentCustomRow/EquipmentCustomRow';
import { IconCheck, IconPlus, IconX } from '@tabler/icons-react';
// import RowWithInputs from '../RowWithInputs/RowWithInputs';
import { useUser } from '@auth0/nextjs-auth0/client';
import NewEquipmentTable from '../EquipmentForm/NewEquipmentTable';
// import { NewEquipment, NewEquipmentType } from '../equipmentStockTable/types';
import useNotification from '@/hooks/useNotification';
import { cloneDeep } from 'lodash';
// import EquipmentSelector from '../EquipmentForm/EquipmentSelector';

const EquipmentTable = () => {
  const { selectedEvent, setSelectedEvent } = useDeganoCtx();
  const [equipmentListToEdit, setEquipmentListToEdit] = useState(
    selectedEvent?.equipment || []
  );
  const { user } = useUser();
  const [showInputRow, setShowInputRow] = useState(false);
  const isAdmin = user?.role === 'admin';
  // const notify = useNotification();
  // const [newEquipment, setNewEquipment] = useState<NewEquipment>({
  //   name: '',
  //   price: 0,
  //   totalQuantity: 0,
  //   currentQuantity: 0,
  //   brand: '',
  //   codeNumber: '',
  //   model: '',
  //   realPrice: 0,
  //   type: 'No Definido'
  // });
  // const placeholderMapping: { [key in keyof NewEquipment]: string } = {
  //   name: 'Nombre',
  //   price: 'Precio del equipo ($)',
  //   totalQuantity: 'Stock total',
  //   currentQuantity: 'Cantidad disponible',
  //   brand: 'Marca',
  //   codeNumber: 'Número de serie',
  //   model: 'Modelo',
  //   realPrice: 'Precio real ($)',
  //   type: 'Clasificación'
  // };

  useEffect(() => {
    if (selectedEvent) {
      setEquipmentListToEdit(selectedEvent.equipment);
    }
  }, [selectedEvent]);

  const handleAddNewRow = () => {
    setShowInputRow(true);
  };

  // const calculateTotal = () => {
  //   return isAdmin
  //     ? equipmentListToEdit.reduce(
  //         (acc, item) => acc + item.price * (item.selectedQuantity || 1),
  //         0
  //       )
  //     : '****';
  // };

  // const handleChange = (field: keyof NewEquipment, value: string | number) => {
  //   setNewEquipment((prev) => ({
  //     ...prev,
  //     [field]: value
  //   }));
  // };

  // const makePutRequest = async (newEquipment: NewEquipment) => {
  //   notify({ loading: true });
  //   try {
  //     const response = await fetch('/api/updateEquipmentV2', {
  //       method: 'PUT',
  //       body: JSON.stringify({ equipment: newEquipment }),
  //       cache: 'no-store',
  //       headers: {
  //         'Content-Type': 'application/json'
  //       }
  //     });
  //     const equipmentData = await response.json();
  //     const equipmentUpdated = [
  //       ...equipmentListToEdit,
  //       equipmentData.insertedDocument
  //     ];
  //     const event = cloneDeep(selectedEvent);
  //     event!.equipment = equipmentUpdated;
  //     const eventResponse = await fetch(`/api/updateEvent`, {
  //       method: 'PUT',
  //       cache: 'no-store',
  //       headers: {
  //         'Content-Type': 'application/json'
  //       },
  //       body: JSON.stringify(event)
  //     });
  //     const data = await eventResponse.json();
  //     notify({ message: 'Se actualizo el evento correctamente' });
  //     setSelectedEvent(data.event);
  //     return await eventResponse.json();
  //   } catch (error) {
  //     notify({ type: 'defaultError' });
  //     console.error('Error en la solicitud PUT:', error);
  //     throw error;
  //   }
  // };

  // const handleAddEquipment = async (equipmentItem: typeof newEquipment) => {
  //   const formattedEquipment: NewEquipment = {
  //     name: equipmentItem.name,
  //     price: Number(equipmentItem.price),
  //     totalQuantity: Number(equipmentItem.totalQuantity),
  //     currentQuantity: Number(equipmentItem.currentQuantity),
  //     brand: equipmentItem.brand,
  //     codeNumber: equipmentItem.codeNumber,
  //     model: equipmentItem.model,
  //     realPrice: Number(equipmentItem.realPrice),
  //     type: equipmentItem.type as NewEquipmentType
  //   };
  //   const response = await makePutRequest(formattedEquipment);
  //   if (response.status === 200) {
  //     setEquipmentListToEdit([
  //       ...(selectedEvent?.equipment ?? []),
  //       response.insertedDocument
  //     ]);
  //     setShowInputRow(false);
  //   }
  //   setNewEquipment({
  //     name: '',
  //     price: 0,
  //     totalQuantity: 0,
  //     currentQuantity: 0,
  //     brand: '',
  //     codeNumber: '',
  //     model: '',
  //     realPrice: 0,
  //     type: 'No Definido'
  //   });
  // };

  return (
    <Table>
      <TableThead>
        <TableTh style={{ width: '60%' }}>Equipo</TableTh>
        <TableTh>Cantidad</TableTh>
        <TableTh>Precio ($)</TableTh>
        <TableTh>Subtotal</TableTh>
        <TableTh>Acciones</TableTh>
        <TableTh>
          <div
            className='cursorPointer'
            style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}
            onClick={() => setShowInputRow(!showInputRow)}
          >
            {!showInputRow ? <IconPlus /> : <IconX />}
          </div>
        </TableTh>
      </TableThead>
      <TableTbody>
        {/* {(showInputRow && selectedEvent) &&(
          <RowWithInputs hideRow={() => setShowInputRow(false)} />
          <div style={{ display: 'flex' }}>
            <NewEquipmentTable
              handleChange={handleChange}
              newEquipment={newEquipment}
              placeholderMapping={placeholderMapping}
              newEvent={false}
            />
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-evenly',
                alignItems: 'center',
                marginLeft: '10px'
              }}
            >
              <IconCheck
                color='green'
                onClick={() => handleAddEquipment(newEquipment)}
                className='cursorPointer'
              />
              <IconX
                color='red'
                onClick={() => setShowInputRow(false)}
                className='cursorPointer'
              />
            </div>
          </div>
          <EquipmentSelector 
          event={selectedEvent}
          showInputsToAdd={showInputRow}
          setShowInputsToAdd={setShowInputRow}
          setPrice={()=>{}} />
        )} */}
        {equipmentListToEdit.map((eq, i) => (
          <CustomRow
            setEquipmentListToEdit={setEquipmentListToEdit}
            equipmentListToEdit={equipmentListToEdit}
            index={i}
            key={i}
            eq={eq}
          />
        ))}
        {/* <TableTr>
          <TableTd align='right' colSpan={6}>
            Total: ${calculateTotal()}
          </TableTd>
        </TableTr> */}
      </TableTbody>
    </Table>
  );
};

export default EquipmentTable;

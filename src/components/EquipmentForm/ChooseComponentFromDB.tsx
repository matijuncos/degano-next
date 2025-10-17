// import { useState } from 'react';
// import {
//   Box,
//   Checkbox,
//   Input,
//   Table,
//   TableTbody,
//   TableTd,
//   TableThead,
//   TableTr,
//   Text
// } from '@mantine/core';
// import { NewEquipment, NewEquipmentType } from '../equipmentStockTable/types';
// import { EventModel } from '@/context/types';
// import { IconCheck, IconX } from '@tabler/icons-react';
// import useNotification from '@/hooks/useNotification';
// import NewEquipmentTable from './NewEquipmentTable';

// const ChoseComponentFromDBComponent = ({
//   equipment,
//   setEquipment,
//   equipmentFromDB,
//   setEquipmentFromDB,
//   showInputsToAdd,
//   setShowInputsToAdd
// }: {
//   equipment: EventModel;
//   setEquipment: Function;
//   equipmentFromDB: NewEquipment[];
//   setEquipmentFromDB: Function;
//   showInputsToAdd: Boolean,
//   setShowInputsToAdd: Function
// }) => {
//   const [newEquipment, setNewEquipment] = useState<NewEquipment>({
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
//   const notify = useNotification();

//   const placeholderMapping: { [key in keyof NewEquipment]: string } = {
//     name: 'Nombre',
//     price: 'Precio del equipo ($)',
//     totalQuantity: 'Stock total',
//     currentQuantity: 'Cantidad disponible',
//     brand: 'Marca',
//     codeNumber: 'Número de serie',
//     model: 'Modelo',
//     realPrice: 'Precio real ($)',
//     type: 'Clasificación',
//   };

//   const hasValidId = (item: { _id?: string }): item is { _id: string } => {
//     return Boolean(item._id);
//   };  

//   const handleChange = (field: keyof NewEquipment, value: string | number) => {
//     setNewEquipment((prev) => ({
//       ...prev,
//       [field]: value,
//     }));
//   };

//   const handleCheckEquipment = (value: NewEquipment) => {  
//     const existsInEquipment = equipment.equipment.some(
//       (item) => hasValidId(item) && hasValidId(value) && item._id.toString() === value._id.toString()
//     );
//     if (existsInEquipment) {
//       const updatedEquipment = equipment.equipment.filter(
//         (item) => hasValidId(item) && hasValidId(value) && item._id.toString() !== value._id.toString()
//       );

//       setEquipment({
//         ...equipment,
//         equipment: updatedEquipment,
//       });
//     } else {
//       const newItem = hasValidId(value)
//         ? value
//         : { ...value, _id: new Date().toISOString() };
//       const updatedEquipment = [...equipment.equipment, newItem];
//       setEquipment({
//         ...equipment,
//         equipment: updatedEquipment,
//       });
//     }
//   };

//   const handleQuantityChange = (id: string, quantity?: number) => {
//     setEquipment((prev: EventModel) => {
//       return {
//         ...prev,
//         equipment: prev.equipment.map((item) =>
//           hasValidId(item) &&
//           item._id.toString() === id
//             ? { ...item, selectedQuantity: quantity }
//             : item
//         )
//       };
//     });
//   };

//   const makePutRequest = async (newEquipment: NewEquipment) => {
//     notify({loading: true});
//     try {
//       const response = await fetch('/api/updateEquipmentV2', {
//         method: 'PUT',
//         body: JSON.stringify({equipment: newEquipment}),
//         cache: 'no-store',
//         headers: {
//           'Content-Type': 'application/json'
//         }
//       });
//       notify({message: 'Se creo el nuevo equipamiento correctamente'});
//       return await response.json();
//     } catch (error) {
//       notify({type: 'defaultError'});
//       console.error("Error en la solicitud PUT:", error);
//       throw error;
//     }
//   };

//   const handleAddEquipment = async (equipmentItem: typeof newEquipment) => {
//     const formattedEquipment: NewEquipment = {
//       name: equipmentItem.name,
//       price: Number(equipmentItem.price),
//       totalQuantity: Number(equipmentItem.totalQuantity),
//       currentQuantity: Number(equipmentItem.currentQuantity),
//       brand: equipmentItem.brand,
//       codeNumber: equipmentItem.codeNumber,
//       model: equipmentItem.model,
//       realPrice: Number(equipmentItem.realPrice),
//       type: equipmentItem.type as NewEquipmentType,
//     };
//     const response = await makePutRequest(formattedEquipment);
//     if(response.status === 200) {      
//       setEquipmentFromDB([...equipmentFromDB, response.insertedDocument]);
//       setShowInputsToAdd(false);
//     }
//     setNewEquipment({
//       name: '',
//       price: 0,
//       totalQuantity: 0,
//       currentQuantity: 0,
//       brand: '',
//       codeNumber: '',
//       model: '',
//       realPrice: 0,
//       type: 'No Definido'
//     });
//   };

//   return (
//     <>
//       <Box>
//         <Table>
//           <TableThead>
//             <TableTr>
//               <TableTd></TableTd>
//               <TableTd>Nombre</TableTd>
//               {equipment.equipment.length > 0 && <TableTd>Cantidad</TableTd>}
//               <TableTd>Cantidad disponible</TableTd>
//             </TableTr>
//           </TableThead>
//           <TableTbody>
//             {(equipmentFromDB as NewEquipment[])?.map((eq, idx) => {
//               const selectedItem = equipment.equipment.find(
//                 (item) => hasValidId(item) && hasValidId(eq) && item._id.toString() === eq._id.toString()
//               );
//               return (
//                 <TableTr key={eq._id || idx}>
//                   <TableTd>
//                     <Checkbox
//                       checked={Boolean(selectedItem)}
//                       onChange={() => handleCheckEquipment(eq)}
//                     />
//                   </TableTd>
//                   <TableTd>{eq.name}</TableTd>
//                   {equipment.equipment.length > 0 && (
//                     <TableTd>
//                       {Boolean(selectedItem) && (
//                         <Input
//                           type='number'
//                           placeholder='cuantos llevas?'
//                           value={selectedItem?.selectedQuantity}
//                           onChange={(e) =>
//                             hasValidId(eq) && 
//                             handleQuantityChange(
//                               eq._id.toString(),
//                               e.target.value === '' ? undefined : Number(e.target.value)
//                             )
//                           }
//                           min={1}
//                         />
//                       )}
//                     </TableTd>
//                   )}
//                   <TableTd>
//                     <Text
//                       c={
//                         Number(eq.currentQuantity) -
//                           Number(selectedItem?.selectedQuantity || 0) >=
//                         0
//                           ? 'green'
//                           : 'red'
//                       }
//                     >
//                       {/* {Number(eq.currentQuantity) -
//                         Number(selectedItem?.selectedQuantity || 0)} */}
//                       {Number(eq.currentQuantity) || 0}
//                     </Text>
//                   </TableTd>
//                   <TableTd></TableTd>
//                 </TableTr>
//               );
//             })}
//           </TableTbody>
//         </Table>
//             {showInputsToAdd && (
//                <div style={{display: 'flex'}}>
//                 <NewEquipmentTable 
//                   handleChange={handleChange}
//                   newEquipment={newEquipment}
//                   placeholderMapping={placeholderMapping}
//                 />
//                  <div style={{display: 'flex', flexDirection: 'column', justifyContent: 'space-evenly', alignItems: 'center', marginLeft: '10px'}}>
//                   <IconCheck color='green' onClick={() => handleAddEquipment(newEquipment)} className='cursorPointer'/>
//                   <IconX color='red' onClick={() => setShowInputsToAdd(false)} className='cursorPointer' />
//                 </div> 
//               </div>
//             )}
//       </Box>
//     </>
//   );
// };

// export default ChoseComponentFromDBComponent;

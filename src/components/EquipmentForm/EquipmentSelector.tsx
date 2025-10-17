// 'use client';

// import { useEffect, useState } from 'react';
// import { Flex, Text, ActionIcon } from '@mantine/core';
// import { IconTrash } from '@tabler/icons-react';
// import ChooseComponentFromDBComponent from './ChooseComponentFromDB'; // ajusta si la ruta es distinta
// import { EventModel } from '@/context/types';
// import { NewEquipment } from '../equipmentStockTable/types';
// import { useUser } from '@auth0/nextjs-auth0/client';

// type EquipmentSelectorProps = {
//   event: EventModel;
//   showInputsToAdd: boolean;
//   setShowInputsToAdd: (value: boolean) => void;
//   setPrice: (price: number) => void;
// };

// export default function EquipmentSelector({
//   event,
//   showInputsToAdd,
//   setShowInputsToAdd,
//   setPrice,
// }: EquipmentSelectorProps) {
//   const [equipment, setEquipment] = useState<EventModel>(event);
//   const [equipmentFromDB, setEquipmentFromDB] = useState<NewEquipment[]>([]);
//   const { user } = useUser();
  
//   useEffect(() => {
//     const getEquipmentFromDB = async () => {
//       const response = await fetch('/api/getEquipmentV2');
//       const data = await response.json();
//       setEquipmentFromDB(data.equipment || []);
//     };
//     getEquipmentFromDB();
//   }, [setEquipmentFromDB]);

//   const handleRemoveEquipment = (idxToRemove: number) => {
//     setEquipment((prevEquipment) => {
//       const updatedEquipment = prevEquipment.equipment.filter(
//         (_, idx) => idx !== idxToRemove
//       );
//       const newPrice = updatedEquipment.reduce((total, item) => {
//         return total + item.price * Number(item.selectedQuantity);
//       }, 0);
//       setPrice(newPrice);
//       return { ...prevEquipment, equipment: updatedEquipment };
//     });
//   };

//   return (
//     <>
//       {/* <ChooseComponentFromDBComponent
//         equipment={equipment}
//         setEquipment={setEquipment}
//         equipmentFromDB={equipmentFromDB}
//         setEquipmentFromDB={setEquipmentFromDB}
//         showInputsToAdd={showInputsToAdd}
//         setShowInputsToAdd={setShowInputsToAdd}
//       /> */}

//       <Flex
//         className='cantidad-precio-lista'
//         direction='column'
//         gap='6px'
//         style={{ width: '90%' }}
//         mt='12px'
//       >
//         {equipment?.equipment
//           ?.filter((eq) => Number(eq.selectedQuantity) > 0)
//           .map((item, idx) => {
//             return (
//               <Flex
//                 gap='6px'
//                 key={item.name + idx}
//                 className='equipmentDiv flex'
//                 p='3px 6px'
//                 style={{
//                   border: 'solid 1px white',
//                   width: 'fit-content',
//                   borderRadius: '4px'
//                 }}
//               >
//                 <Text className='itemName'> {item.name}</Text>|
//                 <Text className='quantity'>
//                   Cantidad: {item.selectedQuantity}
//                 </Text>
//                 |
//                 {user?.role === 'admin' && (
//                   <Text className='price'>
//                     Precio individual: ${item.price}
//                   </Text>
//                 )}
//                 -
//                 <ActionIcon
//                   size='sm'
//                   variant='subtle'
//                   color='red'
//                   onClick={(e) => handleRemoveEquipment(idx)}
//                 >
//                   <IconTrash size={16} />
//                 </ActionIcon>
//               </Flex>
//             );
//           })}
//       </Flex>
//     </>
//   );
// }

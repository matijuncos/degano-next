import { Equipment, EventModel } from '@/context/types';
import { Button, Flex, Input, Text } from '@mantine/core';
import { ActionIcon } from '@mantine/core';
import { IconTrash } from '@tabler/icons-react';
import { useState } from 'react';

const EquipmentForm = ({
  event,
  onNextTab,
  onBackTab
}: {
  event: EventModel;
  onNextTab: Function;
  onBackTab: Function;
}) => {
  const [equipment, setEquipment] = useState<EventModel>(event);
  const newDefaultEquipment: Equipment = {
    name: '',
    price: 0,
    quantity: 0
  };
  const [newEquipment, setNewEquipment] = useState(newDefaultEquipment);
  const [price, setPrice] = useState<number>(0);

  const addEquipment = () => {
    setEquipment({
      ...equipment,
      equipment: [...equipment.equipment, newEquipment]
    });
    setPrice(price + newEquipment.price * newEquipment.quantity);
    setNewEquipment(newDefaultEquipment);
  };
  const next = () => {
    onNextTab(4, equipment);
  };
  const back = () => {
    onBackTab(2, equipment);
  };
  const handleChange = (e: any) => {
    setNewEquipment({
      ...newEquipment,
      [e.target.name]: e.target.value
    });
  };
  const handleRemoveEquipment = (idxToRemove: number) => {
    setEquipment((prevEquipment) => {
      const updatedEquipment = prevEquipment.equipment.filter(
        (_, idx) => idx !== idxToRemove
      );
      const newPrice = updatedEquipment.reduce((totalPrice, equipment) => {
        return totalPrice + equipment.price * equipment.quantity;
      }, 0);
      setPrice(newPrice);
      return { ...prevEquipment, equipment: updatedEquipment };
    });
  };
  return (
    <div>
      <h2>Equipamiento necesario</h2>
      <div>
        <div className='equipment-inputs'>
          <Input
            type='text'
            placeholder='Equipamiento'
            onChange={handleChange}
            name='name'
            value={newEquipment.name}
          />
          <Input
            type='number'
            placeholder='Precio'
            onChange={handleChange}
            name='price'
            value={newEquipment.price ? newEquipment.price : ''}
          />
          <Input
            type='number'
            placeholder='Cantidad'
            onChange={handleChange}
            name='quantity'
            min={1}
            value={newEquipment.quantity ? newEquipment.quantity : ''}
          />
        </div>
        <Button onClick={addEquipment} mt='16px'>
          Agregar equipo
        </Button>
        <Flex
          className='cantidad-precio-lista'
          direction='column'
          gap='6px'
          style={{ width: '90%' }}
          mt='12px'
        >
          {equipment?.equipment
            ?.filter((eq) => eq.quantity > 0)
            .map((item, idx) => {
              return (
                <Flex
                  gap='6px'
                  key={item.name + idx}
                  className='equipmentDiv flex'
                  p='3px 6px'
                  style={{
                    border: 'solid 1px white',
                    width: 'fit-content',
                    borderRadius: '4px'
                  }}
                >
                  <Text className='itemName'> {item.name}</Text>|
                  <Text className='quantity'>Cantidad: {item.quantity}</Text>|
                  <Text className='price'>Precio: ${item.price}</Text>-
                  <ActionIcon
                    size='sm'
                    variant='subtle'
                    color='red'
                    onClick={(e) => handleRemoveEquipment(idx)}
                  >
                    <IconTrash size={16} />
                  </ActionIcon>
                </Flex>
              );
            })}
        </Flex>
        <div
          style={{ display: 'flex', alignItems: 'center', marginTop: '12px' }}
        >
          <h3 style={{ fontWeight: 'bold' }}>Total: </h3>
          <p>${price}</p>
        </div>
      </div>
      <div
        style={{
          display: 'flex',
          gap: '12px',
          flexDirection: 'column',
          marginTop: '16px'
        }}
      >
        <Button variant='brand' onClick={back}>
          Atrás
        </Button>
        <Button variant='brand' onClick={next}>
          Siguiente
        </Button>
      </div>
    </div>
  );
};
export default EquipmentForm;

import { EventModel } from '@/context/types';
import { Box, Button, Flex, Input, Switch, Text } from '@mantine/core';
import { ActionIcon } from '@mantine/core';
import { IconTrash } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { NewEquipment } from '../equipmentStockTable/types';
import ChoseComponentFromDBComponent from './ChooseComponentFromDB';
import { EVENT_TABS } from '@/context/config';
import { useUser } from '@auth0/nextjs-auth0/client';

const EquipmentForm = ({
  event,
  onNextTab,
  onBackTab
}: {
  event: EventModel;
  onNextTab: Function;
  onBackTab: Function;
}) => {
  const { user } = useUser();
  const [equipment, setEquipment] = useState<EventModel>(event);
  const [useEquipmentDataBase, setUseEquipmentDataBase] = useState(true);
  const [equipmentFromDB, setEquipmentFromDB] = useState<NewEquipment[]>([]);
  const newDefaultEquipment: NewEquipment = {
    name: '',
    price: 0,
    currentQuantity: 0,
    totalQuantity: 0,
    _id: new Date().toISOString()
  };
  const [newEquipment, setNewEquipment] = useState(newDefaultEquipment);
  const [price, setPrice] = useState<number>(0);

  const addEquipment = () => {
    setEquipment({
      ...equipment,
      equipment: [...equipment.equipment, newEquipment]
    });
    setPrice(
      price + newEquipment.price * Number(newEquipment.selectedQuantity)
    );
    setNewEquipment(newDefaultEquipment);
  };
  const next = () => {
    onNextTab(4, equipment);
  };
  const back = () => {
    onBackTab(EVENT_TABS.MUSIC, equipment);
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
        return (
          totalPrice + equipment.price * Number(equipment.selectedQuantity)
        );
      }, 0);
      setPrice(newPrice);
      return { ...prevEquipment, equipment: updatedEquipment };
    });
  };

  useEffect(() => {
    const getEquipmentFromDB = async () => {
      const response = await fetch('/api/getEquipmentV2');
      const data = await response.json();
      setEquipmentFromDB(data.equipment[0]?.equipment as NewEquipment[]);
    };
    getEquipmentFromDB();
  }, []);

  return (
    <div>
      <h2>Equipamiento necesario </h2>
      <Flex gap='12px' align='center' my='18px'>
        <Text
          size='20px'
          onClick={() => setUseEquipmentDataBase(!useEquipmentDataBase)}
        >
          {useEquipmentDataBase
            ? 'Seleccionar de base de datos'
            : 'Escribir equipos manualmente'}
        </Text>
        <Switch
          color='green'
          checked={useEquipmentDataBase}
          onChange={() => setUseEquipmentDataBase(!useEquipmentDataBase)}
        />
      </Flex>
      <div>
        {useEquipmentDataBase ? (
          <>
            <ChoseComponentFromDBComponent
              equipment={equipment}
              setEquipment={setEquipment}
              equipmentFromDB={equipmentFromDB}
            />
          </>
        ) : (
          <>
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
                name='selectedQuantity'
                min={1}
                value={
                  newEquipment.selectedQuantity
                    ? newEquipment.selectedQuantity
                    : ''
                }
              />
            </div>
            <Button onClick={addEquipment} mt='16px'>
              Agregar equipo
            </Button>
          </>
        )}

        <Flex
          className='cantidad-precio-lista'
          direction='column'
          gap='6px'
          style={{ width: '90%' }}
          mt='12px'
        >
          {equipment?.equipment
            ?.filter((eq) => Number(eq.selectedQuantity) > 0)
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
                  <Text className='quantity'>
                    Cantidad: {item.selectedQuantity}
                  </Text>
                  |
                  {user?.role === 'admin' && (
                    <Text className='price'>Precio: ${item.price}</Text>
                  )}
                  -
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

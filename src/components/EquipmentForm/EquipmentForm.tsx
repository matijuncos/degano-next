import { EventModel } from '@/context/types';
import { Button, Input } from '@mantine/core';
import { useParams } from 'next/navigation';
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
  const [newEquipment, setNewEquipment] = useState({
    name: '',
    price: 0,
    quantity: 0
  });
  const [price, setPrice] = useState(0);
  const { id } = useParams();
  const priceSum = () => {
    if (id) {
      const totalPrice = event.equipment.reduce(
        (total, equipment) => total + equipment.price * equipment.quantity,
        0
      );
      setPrice(totalPrice);
    } else {
      console.log(price);
    }
  };
  const addEquipment = () => {
    setEquipment({
      ...equipment,
      equipment: [...equipment.equipment, newEquipment]
    });
    setPrice(price + newEquipment.price * newEquipment.quantity);
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
          />
          <Input
            type='number'
            placeholder='Precio'
            onChange={handleChange}
            name='price'
          />
          <Input
            type='number'
            placeholder='Cantidad'
            onChange={handleChange}
            name='quantity'
            min={1}
          />
        </div>
        <Button onClick={addEquipment} mt='16px'>
          Agregar equipo
        </Button>
        <div className='cantidad-precio-lista' style={{ width: '90%' }}>
          {equipment?.equipment
            ?.filter((eq) => eq.quantity > 0)
            .map((item, idx) => {
              return (
                <div key={item.name + idx} className='equipmentDiv'>
                  <p className='itemName'>{item.name}</p>
                  <p className='price'>${item.price}</p>
                  <p className='quantity'>{item.quantity}</p>
                </div>
              );
            })}
          <div
            style={{ display: 'flex', alignItems: 'center', marginTop: '12px' }}
          >
            <h3 style={{ fontWeight: 'bold' }}>Total: </h3>
            <p>${price}</p>
          </div>
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

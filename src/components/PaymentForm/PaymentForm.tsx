import { EVENT_TABS } from '@/context/config';
import { EventModel } from '@/context/types';
import { Button, Input } from '@mantine/core';
import { DateTimePicker, DateValue } from '@mantine/dates';
import { useState } from 'react';
const PaymentForm = ({
  event,
  onBackTab,
  onFinish
}: {
  event: EventModel;
  onBackTab: Function;
  onFinish: Function;
}) => {
  const [payment, setPayment] = useState<EventModel>(event);
  const save = async () => {
    await onFinish(payment);
  };
  const back = () => {
    onBackTab(EVENT_TABS.EQUIPMENT, payment);
  };
  const handlechange = (e: any) => {
    setPayment({
      ...payment,
      payment: {
        ...payment.payment,
        [e.target.name]: e.target.value
      }
    });
  };
  const handleDates = (value: string | DateValue, name: string) => {
    setPayment({
      ...payment,
      payment: {
        ...payment.payment,
        [name]: value
      }
    });
  };
  return (
    <div>
      <h3>Datos de pago</h3>
      <Input
        type='number'
        placeholder='Monto total del evento ($)'
        onChange={handlechange}
        name='totalToPay'
        value={payment.payment.totalToPay}
        mb='16px'
      />
      <div className='inputs-grid'>
        <Input
          type='number'
          placeholder='Monto del pago inicial ($)'
          onChange={handlechange}
          name='upfrontAmount'
          value={payment.payment.upfrontAmount}
        />
        <DateTimePicker
          name='partialPaymentDate'
          dropdownType='modal'
          valueFormat='DD MMM YYYY hh:mm A'
          placeholder='Fecha de pago inicial'
          onChange={(value) => handleDates(value, 'partialPaymentDate')}
        />
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
        <Button variant='brand' onClick={save}>
          Guardar
        </Button>
      </div>
    </div>
  );
};
export default PaymentForm;

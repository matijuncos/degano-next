import { EventModel } from '@/context/types';
import { Button, Input } from '@mantine/core';
import { useState } from 'react';
import { DateTimePicker, DateValue } from '@mantine/dates';
import { useParams } from 'next/navigation';
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
  const { id } = useParams();
  const save = async () => {
    if (id) {
      // update
    } else {
      await onFinish();
    }
  };
  const back = () => {
    onBackTab(3, payment);
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
      <div className='inputs-grid'>
        <Input
          type='number'
          placeholder='Monto Seña'
          onChange={handlechange}
          name='upfrontAmount'
          value={payment.payment.upfrontAmount}
        />
        <DateTimePicker
          name='partialPaymentDate'
          dropdownType='modal'
          valueFormat='DD MMM YYYY hh:mm A'
          placeholder='Fecha de seña'
          onChange={(value) => handleDates(value, 'partialPaymentDate')}
        />
        <Input
          type='number'
          placeholder='Monto total'
          onChange={handlechange}
          name='totalToPay'
          value={payment.payment.totalToPay}
        />
        <DateTimePicker
          name='totalPaymentDate'
          dropdownType='modal'
          valueFormat='DD MMM YYYY hh:mm A'
          placeholder='Fecha de seña'
          onChange={(value) => handleDates(value, 'totalPaymentDate')}
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

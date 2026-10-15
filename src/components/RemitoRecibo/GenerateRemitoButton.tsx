'use client';
import React, { useState } from 'react';
import { Button, Modal, Group, Stack, TextInput, Text, Select } from '@mantine/core';
import { IVA_OPTIONS } from '@/utils/remitoLayout';
import { IconFileInvoice, IconEye, IconDownload } from '@tabler/icons-react';
import { pdf } from '@react-pdf/renderer';
import { EventModel } from '@/context/types';
import PrintableRemitoSection from '@/components/PrintableSections/PrintableRemitoSection';
import useNotification from '@/hooks/useNotification';
import { savePdfBlob } from '@/utils/savePdfBlob';

// Formatea un CUIT argentino mientras se escribe: "20 - 40247019 - 5" (2-8-1).
const formatCuit = (val: string) => {
  const d = val.replace(/\D/g, '').slice(0, 11);
  return [d.slice(0, 2), d.slice(2, 10), d.slice(10, 11)]
    .filter(Boolean)
    .join(' - ');
};

// Botón + modal para generar el Remito. Antes de ver/descargar permite completar
// el domicilio del destinatario y los datos del transportista. La fecha del PDF
// es siempre la del momento en que se genera (hoy).
const GenerateRemitoButton = ({ event }: { event: EventModel }) => {
  const [opened, setOpened] = useState(false);
  const [loading, setLoading] = useState<'view' | 'download' | null>(null);
  const notify = useNotification();

  // Campos editables (se prellenan al abrir el modal)
  const [domicilio, setDomicilio] = useState('');
  const [localidad, setLocalidad] = useState('');
  const [destinatarioIva, setDestinatarioIva] = useState<string | null>(null);
  const [destinatarioCuit, setDestinatarioCuit] = useState('');
  const [destinatarioIngBrutos, setDestinatarioIngBrutos] = useState('');
  const [transportista, setTransportista] = useState('');
  const [transportistaDomicilio, setTransportistaDomicilio] = useState('');
  const [transportistaCuit, setTransportistaCuit] = useState('');
  const [transportistaIngBrutos, setTransportistaIngBrutos] = useState('');

  const openModal = () => {
    setDomicilio(event.eventAddress || event.address || '');
    setLocalidad(event.eventCity || '');
    setDestinatarioIva(null);
    setDestinatarioCuit('');
    setDestinatarioIngBrutos('');
    setTransportista('');
    setTransportistaDomicilio('');
    setTransportistaCuit('');
    setTransportistaIngBrutos('');
    setOpened(true);
  };

  const buildBlob = async () => {
    const res = await fetch(`/api/remitoNumber?eventId=${event._id}`, {
      method: 'POST'
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error');
    return pdf(
      <PrintableRemitoSection
        event={event}
        remitoNumber={data.remitoNumber}
        domicilio={domicilio}
        localidad={localidad}
        destinatarioIva={destinatarioIva || undefined}
        destinatarioCuit={destinatarioCuit}
        destinatarioIngBrutos={destinatarioIngBrutos}
        transportista={transportista}
        transportistaDomicilio={transportistaDomicilio}
        transportistaCuit={transportistaCuit}
        transportistaIngBrutos={transportistaIngBrutos}
      />
    ).toBlob();
  };

  const fileName = () =>
    `REMITO - ${event.fullName || 'Cliente'} - ${event.type || 'Evento'}`
      .replace(/[\/\\:*?"<>|]/g, '-')
      .trim();

  const handleView = async () => {
    try {
      setLoading('view');
      const blob = await buildBlob();
      window.open(URL.createObjectURL(blob));
    } catch (e) {
      console.error('Error generando remito:', e);
      notify({ type: 'defaultError' });
    } finally {
      setLoading(null);
    }
  };

  const handleDownload = async () => {
    try {
      setLoading('download');
      const blob = await buildBlob();
      await savePdfBlob(blob, fileName());
      setOpened(false);
    } catch (e) {
      console.error('Error generando remito:', e);
      notify({ type: 'defaultError' });
    } finally {
      setLoading(null);
    }
  };

  return (
    <>
      <Button
        variant='light'
        color='green'
        leftSection={<IconFileInvoice size={16} />}
        onClick={openModal}
      >
        Generar Remito
      </Button>

      <Modal
        opened={opened}
        onClose={() => setOpened(false)}
        title='Generar Remito'
        size='lg'
        centered
        classNames={{ body: 'hide-scrollbar', content: 'hide-scrollbar' }}
      >
        <Stack gap='sm'>
          <Text fw={600} size='sm'>
            Destinatario
          </Text>
          <Group grow>
            <TextInput
              label='Domicilio'
              value={domicilio}
              onChange={(e) => setDomicilio(e.target.value)}
            />
            <TextInput
              label='Localidad'
              value={localidad}
              onChange={(e) => setLocalidad(e.target.value)}
            />
          </Group>
          <Group grow>
            <Select
              label='Condición frente al IVA'
              placeholder='Sin marcar'
              data={[...IVA_OPTIONS]}
              value={destinatarioIva}
              onChange={setDestinatarioIva}
              clearable
              comboboxProps={{ withinPortal: true }}
            />
            <TextInput
              label='CUIT'
              value={destinatarioCuit}
              onChange={(e) => setDestinatarioCuit(formatCuit(e.target.value))}
            />
            <TextInput
              label='Ing. Brutos'
              value={destinatarioIngBrutos}
              onChange={(e) => setDestinatarioIngBrutos(e.target.value)}
            />
          </Group>

          <Text fw={600} size='sm' mt='xs'>
            Transportista
          </Text>
          <Group grow>
            <TextInput
              label='Transportista'
              value={transportista}
              onChange={(e) => setTransportista(e.target.value)}
            />
            <TextInput
              label='Domicilio'
              value={transportistaDomicilio}
              onChange={(e) => setTransportistaDomicilio(e.target.value)}
            />
          </Group>
          <Group grow>
            <TextInput
              label='CUIT'
              value={transportistaCuit}
              onChange={(e) => setTransportistaCuit(formatCuit(e.target.value))}
            />
            <TextInput
              label='Ing. Brutos'
              value={transportistaIngBrutos}
              onChange={(e) => setTransportistaIngBrutos(e.target.value)}
            />
          </Group>

          <Text size='xs' c='dimmed'>
            Los campos que dejes vacíos aparecerán como línea para completar a
            mano. La fecha del remito es siempre la de hoy.
          </Text>

          <Group justify='flex-end' mt='sm'>
            <Button
              variant='light'
              leftSection={<IconEye size={16} />}
              onClick={handleView}
              loading={loading === 'view'}
            >
              Ver
            </Button>
            <Button
              color='green'
              leftSection={<IconDownload size={16} />}
              onClick={handleDownload}
              loading={loading === 'download'}
            >
              Descargar
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
};

export default GenerateRemitoButton;

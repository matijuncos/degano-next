'use client';
import React, { useState } from 'react';
import {
  Button,
  Modal,
  Group,
  Stack,
  TextInput,
  Textarea,
  Select
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { IconReceipt, IconEye, IconDownload } from '@tabler/icons-react';
import { pdf } from '@react-pdf/renderer';
import { EventModel } from '@/context/types';
import PrintableReciboSection from '@/components/PrintableSections/PrintableReciboSection';
import { savePdfBlob } from '@/utils/savePdfBlob';

// Ítems por defecto a partir del presupuesto: base + anexos (los "gastos"),
// editables luego. NO se listan equipos ni el saldo restante.
const autoItems = (event: EventModel): string => {
  const p = event.payment;
  const lines: string[] = [];
  if (p?.totalToPay && Number(p.totalToPay) > 0) lines.push('Presupuesto inicial');
  (p?.annexes || []).forEach((a: any) => {
    if (a?.description && a.description.trim()) lines.push(a.description.trim());
  });
  return lines.join('\n');
};

// Formateo/parseo del monto (igual que en el presupuesto: "$ 600.000")
const parseMonto = (value: string): string => value.replace(/[^0-9]/g, '');
const formatMonto = (value: string): string => {
  const digits = parseMonto(value);
  if (!digits) return '';
  return `$ ${new Intl.NumberFormat('es-AR').format(Number(digits))}`;
};

const GenerateReciboButton = ({
  event,
  onSave
}: {
  event: EventModel;
  onSave?: (blob: Blob, cliente: string) => Promise<void>;
}) => {
  const [opened, setOpened] = useState(false);
  const [loading, setLoading] = useState<'view' | 'download' | null>(null);

  // Opciones de destinatario: cliente principal + clientes extra
  const clienteOptions = Array.from(
    new Set(
      [
        event.fullName,
        ...(event.extraClients || []).map((c) => c.fullName)
      ].filter((n): n is string => !!n && n.trim().length > 0)
    )
  );

  // Estado del formulario (se prellena al abrir el modal)
  const [cliente, setCliente] = useState('');
  const [fechaEmision, setFechaEmision] = useState<Date | null>(new Date());
  const [monto, setMonto] = useState('');
  const [concepto, setConcepto] = useState('pago total y reserva');
  const [lugar, setLugar] = useState('');
  const [localidad, setLocalidad] = useState('');
  const [provincia, setProvincia] = useState('');
  const [items, setItems] = useState('');

  const openModal = () => {
    // Monto = SALDO restante = total (base + anexos) − lo ya pagado (adelanto + pagos)
    const base = Number(event.payment?.totalToPay) || 0;
    const anexos = (event.payment?.annexes || []).reduce(
      (s: number, a: any) => s + (Number(a?.amount) || 0),
      0
    );
    const totalBudget = base + anexos;
    const adelanto = Number(event.payment?.upfrontAmount) || 0;
    const pagos = (event.payment?.subsequentPayments || []).reduce(
      (s: number, p: any) => s + (Number(p?.amount) || 0),
      0
    );
    const saldo = totalBudget - adelanto - pagos;

    setCliente(event.fullName || clienteOptions[0] || '');
    setFechaEmision(new Date());
    setMonto(formatMonto(String(saldo > 0 ? saldo : 0)));
    setConcepto('pago total y reserva');
    setLugar(event.lugar || event.eventAddress || '');
    setLocalidad(event.eventCity || '');
    setProvincia(event.eventProvince || 'Córdoba');
    setItems(autoItems(event));
    setOpened(true);
  };

  const buildBlob = () =>
    pdf(
      <PrintableReciboSection
        cliente={cliente || event.fullName}
        fechaEmision={fechaEmision || new Date()}
        monto={Number(parseMonto(monto)) || 0}
        concepto={concepto}
        items={items.split('\n')}
        lugar={lugar}
        localidad={localidad}
        provincia={provincia}
        fechaEvento={event.date}
      />
    ).toBlob();

  const fileName = () =>
    `RECIBO - ${cliente || event.fullName || 'Cliente'} - ${event.type || 'Evento'}`
      .replace(/[\/\\:*?"<>|]/g, '-')
      .trim();

  const handleView = async () => {
    try {
      setLoading('view');
      const blob = await buildBlob();
      window.open(URL.createObjectURL(blob));
    } finally {
      setLoading(null);
    }
  };

  const handleDownload = async () => {
    try {
      setLoading('download');
      const blob = await buildBlob();
      await savePdfBlob(blob, fileName());

      // Guardar el recibo como archivo del evento (S3 + budgetFiles).
      // El nombre guardado (numerado) lo arma el padre; acá solo pasamos el cliente.
      if (onSave) await onSave(blob, cliente || event.fullName || 'Cliente');
      setOpened(false);
    } finally {
      setLoading(null);
    }
  };

  return (
    <>
      <Button
        variant='light'
        color='green'
        leftSection={<IconReceipt size={16} />}
        onClick={openModal}
      >
        Generar Recibo
      </Button>

      <Modal
        opened={opened}
        onClose={() => setOpened(false)}
        title='Generar Recibo'
        size='lg'
        centered
        classNames={{ body: 'hide-scrollbar', content: 'hide-scrollbar' }}
      >
        <Stack gap='sm'>
          <Select
            label='A nombre de'
            data={clienteOptions}
            value={cliente}
            onChange={(v) => setCliente(v || '')}
            allowDeselect={false}
            searchable
          />

          <Group grow>
            <DatePickerInput
              label='Fecha de emisión'
              value={fechaEmision}
              onChange={(val: any) =>
                setFechaEmision(
                  val ? (typeof val === 'string' ? new Date(`${val}T00:00:00`) : val) : null
                )
              }
              valueFormat='DD/MM/YYYY'
            />
            <TextInput
              label='Monto'
              value={monto}
              onChange={(e) => setMonto(formatMonto(e.target.value))}
            />
          </Group>

          <TextInput
            label='Concepto'
            value={concepto}
            onChange={(e) => setConcepto(e.target.value)}
          />

          <Group grow>
            <TextInput
              label='Lugar / Salón'
              value={lugar}
              onChange={(e) => setLugar(e.target.value)}
            />
            <TextInput
              label='Localidad'
              value={localidad}
              onChange={(e) => setLocalidad(e.target.value)}
            />
            <TextInput
              label='Provincia'
              value={provincia}
              onChange={(e) => setProvincia(e.target.value)}
            />
          </Group>

          <Textarea
            label='Ítems (uno por línea)'
            value={items}
            onChange={(e) => setItems(e.target.value)}
            autosize
            minRows={4}
            maxRows={12}
          />

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

export default GenerateReciboButton;

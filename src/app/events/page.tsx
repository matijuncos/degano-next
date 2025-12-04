'use client';

import { DataTable, DataTableSortStatus } from 'mantine-datatable';
import { useEffect, useState } from 'react';
import { sortBy } from 'lodash';
import {
  ActionIcon,
  Box,
  Button,
  Flex,
  Group,
  Modal,
  Text,
  Select
} from '@mantine/core';
import { IconAlertTriangle, IconEye, IconTrash } from '@tabler/icons-react';
import { EventModel } from '@/context/types';
import { useRouter } from 'next/navigation';
import { useDeganoCtx } from '@/context/DeganoContext';
import Loader from '@/components/Loader/Loader';
import { withPageAuthRequired } from '@auth0/nextjs-auth0/client';
import useNotification from '@/hooks/useNotification';
import useLoadingCursor from '@/hooks/useLoadingCursor';

export default withPageAuthRequired(function EventPage() {
  const { allEvents, fetchEvents, loading, setLoading } = useDeganoCtx();
  const [sortStatus, setSortStatus] = useState<DataTableSortStatus<any>>({
    columnAccessor: 'name',
    direction: 'asc'
  });
  const [records, setRecords] = useState(sortBy(allEvents, 'date'));
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const router = useRouter();
  const [eventId, setEventId] = useState('');
  const [clientFilter, setClientFilter] = useState<string>('');
  const [salonFilter, setSalonFilter] = useState<string>('');
  const [filteredRecords, setFilteredRecords] = useState(records);
  const notify = useNotification();
  const setLoadingCursor = useLoadingCursor();

  useEffect(() => {
    const filtered = records.filter(
      (event) =>
        (!clientFilter ||
          clientFilter === '' ||
          event.fullName === clientFilter) &&
        (!salonFilter || salonFilter === '' || event.lugar === salonFilter)
    );
    setFilteredRecords(filtered);
  }, [records, clientFilter, salonFilter]);

  const uniqueClients = Array.from(
    new Set(
      records
        .map((r) => r.fullName)
        .filter((name) => name && name.trim() !== '')
    )
  );

  const uniqueSalons = Array.from(
    new Set(
      records
        .map((r) => r.lugar)
        .filter((lugar) => lugar && lugar.trim() !== '')
    )
  );

  const sortedClients = [...uniqueClients].sort((a, b) => a.localeCompare(b));
  const sortedSalons = [...uniqueSalons].sort((a, b) => a.localeCompare(b));

  useEffect(() => {
    const data = sortBy(allEvents, sortStatus.columnAccessor) as any;
    setRecords(sortStatus.direction === 'desc' ? data.reverse() : data);
  }, [sortStatus, allEvents]);
  enum actions {
    see = 'see',
    edit = 'edit',
    remove = 'remove'
  }

  const removeEvent = async () => {
    setShowConfirmationModal(false);
    setLoading(true);
    setLoadingCursor(true);
    notify({ loading: true });
    try {
      const response = await fetch(`/api/deleteEvent/${eventId}`, {
        method: 'DELETE',
        cache: 'no-store'
      });
      const data = await response.json();
      if (data.success) {
        fetchEvents();
      }
      notify({ message: 'Se elimino el evento correctamente' });
    } catch (error) {
      notify({ type: 'defaultError' });
      console.error(error);
    } finally {
      setLoading(false);
      setLoadingCursor(true);
    }
  };

  const handleEvent = ({
    event,
    action
  }: {
    event: EventModel;
    action: actions;
  }) => {
    if (action === actions.remove) {
      setShowConfirmationModal(true);
      setEventId(event._id);
    }
    if (action === actions.see) {
      setLoadingCursor(true);
      router.push(`/event/${event._id}`);
    } else if (action === actions.edit) {
      // Agregar cuando se defina la nueva pantalla
      return;
    }
  };

  return (
    <>
      <Modal
        opened={showConfirmationModal}
        onClose={() => setShowConfirmationModal(false)}
        title='¿Seguro que quiere eliminar este evento?'
      >
        <Flex direction='column' align='center' gap='16px'>
          <IconAlertTriangle size={80} />
          <Button w='100%' variant='gradient' onClick={() => removeEvent()}>
            Confirmar
          </Button>
          <Button
            w='100%'
            variant='gradient'
            onClick={() => setShowConfirmationModal(false)}
          >
            Cancelar
          </Button>
        </Flex>
      </Modal>
      {loading ? (
        <Loader />
      ) : (
        <>
          <Text size='xl' fw={700}>
            Eventos
          </Text>
          <Flex justify='space-between' mb='md'>
            <Flex gap='md' mb='md'>
              <Select
                placeholder='Filtrar por cliente'
                value={clientFilter}
                onChange={(value) => setClientFilter(value || '')}
                data={[
                  { value: '', label: 'Todos los clientes' },
                  ...sortedClients.map((client) => ({
                    value: client,
                    label: client
                  }))
                ]}
                clearable
                searchable
              />
              <Select
                placeholder='Filtrar por Lugar'
                value={salonFilter}
                onChange={(value) => setSalonFilter(value || '')}
                data={[
                  { value: '', label: 'Todos los salones' },
                  ...sortedSalons.map((lugar) => ({
                    value: lugar,
                    label: lugar
                  }))
                ]}
                clearable
                searchable
              />
            </Flex>
            <Flex align='flex-end' mb='18px' gap='12px'>
              <Flex align='center' gap='6px'>
                Futuros{'  '}{' '}
                <Box
                  w='18px'
                  h='5px'
                  bg='green'
                  style={{ borderRadius: '6px' }}
                />
              </Flex>
              <Flex align='center' gap='6px'>
                Pasados{'  '}{' '}
                <Box
                  w='18px'
                  h='5px'
                  bg='grey'
                  style={{ borderRadius: '6px' }}
                />
              </Flex>
            </Flex>
          </Flex>
          <Box
            style={{
              maxHeight: 'calc(100vh - 200px)',
              overflow: 'auto'
            }}
          >
            <DataTable
              highlightOnHover
              rowColor={({ date }) => {
                const now = new Date();
                if (now <= new Date(date)) return 'green';
                return 'grey';
              }}
              columns={[
                { accessor: 'fullName', title: 'Nombre' },
                {
                  accessor: 'date',
                  title: 'Fecha',
                  render: ({ date }) => new Date(date).toLocaleDateString(),
                  sortable: true
                },
                {
                  accessor: 'date',
                  title: 'Hora',
                  render: ({ date }) => new Date(date).toLocaleTimeString()
                },
                { accessor: 'lugar', title: 'Lugar' },
                { accessor: 'type', title: 'Tipo de evento' },
                {
                  accessor: 'actions',
                  title: 'Acciones',
                  render: (event) => (
                    <Group gap={4} justify='left' wrap='nowrap'>
                      <ActionIcon
                        size='sm'
                        variant='subtle'
                        color='green'
                        onClick={() =>
                          handleEvent({ event, action: actions.see })
                        }
                      >
                        <IconEye size={16} />
                      </ActionIcon>

                      <ActionIcon
                        size='sm'
                        variant='subtle'
                        color='red'
                        onClick={() =>
                          handleEvent({ event, action: actions.remove })
                        }
                      >
                        <IconTrash size={16} />
                      </ActionIcon>
                    </Group>
                  )
                }
              ]}
              records={filteredRecords}
              sortStatus={sortStatus}
              onSortStatusChange={setSortStatus}
            />
          </Box>
        </>
      )}
    </>
  );
});

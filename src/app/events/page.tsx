'use client';

import { DataTable, DataTableSortStatus } from 'mantine-datatable';
import { useEffect, useState } from 'react';
import { sortBy } from 'lodash';
import { ActionIcon, Button, Flex, Group, Modal } from '@mantine/core';
import {
  IconAlertTriangle,
  IconEdit,
  IconEye,
  IconTrash
} from '@tabler/icons-react';
import { EventModel } from '@/context/types';
import { useRouter } from 'next/navigation';
import { useDeganoCtx } from '@/context/DeganoContext';
import axios from 'axios';
import Loader from '@/components/Loader/Loader';

export default function EventPage() {
  const { allEvents, fetchEvents, loading, setLoading } = useDeganoCtx();
  const [sortStatus, setSortStatus] = useState<DataTableSortStatus<any>>({
    columnAccessor: 'name',
    direction: 'asc'
  });
  const [records, setRecords] = useState(sortBy(allEvents, 'date'));
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const router = useRouter();
  const [eventId, setEventId] = useState('');
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
    try {
      const { data } = await axios.delete(`/api/deleteEvent/${eventId}`);
      if (data.success) {
        fetchEvents();
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
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
        <DataTable
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
            { accessor: 'salon', title: 'Salón' },
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
                    onClick={() => handleEvent({ event, action: actions.see })}
                  >
                    <IconEye size={16} />
                  </ActionIcon>
                  <ActionIcon
                    size='sm'
                    variant='subtle'
                    color='blue'
                    onClick={() => handleEvent({ event, action: actions.edit })}
                  >
                    <IconEdit size={16} />
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
          records={records}
          sortStatus={sortStatus}
          onSortStatusChange={setSortStatus}
        />
      )}
    </>
  );
}

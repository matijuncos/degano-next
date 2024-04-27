'use client';

import { DataTable, DataTableSortStatus } from 'mantine-datatable';
import { useEffect, useState } from 'react';
import { sortBy } from 'lodash';
import { ActionIcon, Group } from '@mantine/core';
import { IconEdit, IconEye, IconTrash } from '@tabler/icons-react';
import { EventModel } from '@/context/types';
import { useRouter } from 'next/navigation';
import { useDeganoCtx } from '@/context/DeganoContext';

export default function EventPage() {
  const { allEvents } = useDeganoCtx();
  const [sortStatus, setSortStatus] = useState<DataTableSortStatus<any>>({
    columnAccessor: 'name',
    direction: 'asc'
  });
  const [records, setRecords] = useState(sortBy(allEvents, 'date'));
  const router = useRouter();
  useEffect(() => {
    const data = sortBy(allEvents, sortStatus.columnAccessor) as any;
    setRecords(sortStatus.direction === 'desc' ? data.reverse() : data);
  }, [sortStatus]);
  enum actions {
    see = 'see',
    edit = 'edit',
    remove = 'remove'
  }
  const handleEvent = ({
    event,
    action
  }: {
    event: EventModel;
    action: actions;
  }) => {
    console.log(event, action);
    if (action === actions.see) {
      router.push(`/event/${event._id}`);
    } else if (action === actions.edit) {
      // Agregar cuando se defina la nueva pantalla
      return;
    }
  };

  return (
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
                onClick={() => handleEvent({ event, action: actions.remove })}
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
  );
}

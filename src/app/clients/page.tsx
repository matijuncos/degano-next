'use client';
import { getClientsList } from '@/lib/getClientsList';
import { removeClient } from '@/lib/removeClient';
import { withPageAuthRequired } from '@auth0/nextjs-auth0/client';
import {
  Table,
  TableTbody,
  TableTd,
  TableTh,
  TableThead,
  TableTr
} from '@mantine/core';
import { IconTrash } from '@tabler/icons-react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import useNotification from '@/hooks/useNotification';
interface Client {
  fullName: string;
  phoneNumber: string;
  email: string;
  _id: string;
}

export default withPageAuthRequired(function ClientsPage() {
  const router = useRouter();
  const notify = useNotification();

  const [clientsList, setClientsList] = useState<Client[]>([]);

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const clients = await getClientsList();
        if (clients === 'Unauthorized') {
          notify(
            'No autorizado',
            'No tienes acceso. Contactate con tu administrador',
            'red'
          );
          router.push('/home');
        }
        if (clients.clients) setClientsList(clients.clients);
      } catch (error) {
        console.log(error);
      }
    };
    fetchClients();
  }, []);

  const handleRemoveClient = async (clientId: string) => {
    await removeClient(clientId);
    setClientsList((prevClients) =>
      prevClients.filter((client) => client._id !== clientId)
    );
  };

  return (
    <Table>
      <TableThead>
        <TableTr>
          <TableTh>Nombre</TableTh>
          <TableTh>Email</TableTh>
          <TableTh>Telefono</TableTh>
          <TableTh>Acciones</TableTh>
        </TableTr>
      </TableThead>
      <TableTbody>
        {clientsList.length ? (
          clientsList.map((client) => (
            <TableTr key={client.email}>
              <TableTd>{client.fullName}</TableTd>
              <TableTd>{client.email}</TableTd>
              <TableTd>{client.phoneNumber}</TableTd>
              <TableTd>
                <button onClick={() => handleRemoveClient(client._id)}>
                  <IconTrash color='red' />
                </button>
              </TableTd>
            </TableTr>
          ))
        ) : (
          <TableTr>
            <TableTd colSpan={4} align='center'>
              No hay clientes guardados
            </TableTd>
          </TableTr>
        )}
      </TableTbody>
    </Table>
  );
});

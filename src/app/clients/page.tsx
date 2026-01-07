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
import { usePermissions } from '@/hooks/usePermissions';
import { obfuscatePhone } from '@/utils/roleUtils';

interface Client {
  fullName: string;
  phoneNumber: string;
  email: string;
  _id: string;
}

export default withPageAuthRequired(function ClientsPage() {
  const router = useRouter();
  const notify = useNotification();
  const { can, role } = usePermissions();

  const [clientsList, setClientsList] = useState<Client[]>([]);

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const clients = await getClientsList();
        if (clients.clients) setClientsList(clients.clients);
      } catch (error) {
        console.log(error);
      }
    };
    fetchClients();
  }, []);

  const handleRemoveClient = async (clientId: string) => {
    notify({loading: true});
    try {
      await removeClient(clientId);
      setClientsList((prevClients) =>
        prevClients.filter((client) => client._id !== clientId)
      );
      notify({message: 'Se elimino el cliente correctamente'});
    } catch (err) {
      console.error('Error en la solicitud', err);
      notify({type: 'defaultError'});
      throw err;
    }
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
              <TableTd>{obfuscatePhone(client.phoneNumber, role, 'client')}</TableTd>
              <TableTd>
                {can('canDeleteClients') && (
                  <IconTrash
                    color='red'
                    onClick={() => handleRemoveClient(client._id)}
                    style={{ cursor: 'pointer' }}
                  />
                )}
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

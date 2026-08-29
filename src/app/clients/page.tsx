'use client';
import { getClientsList } from '@/lib/getClientsList';
import { removeClient } from '@/lib/removeClient';
import { updateClient } from '@/lib/updateClient';
import { withPageAuthRequired } from '@auth0/nextjs-auth0/client';
import {
  Table,
  TableTbody,
  TableTd,
  TableTh,
  TableThead,
  TableTr,
  Box,
  Text,
  Group,
  ActionIcon,
  Modal,
  TextInput,
  Button,
  Stack
} from '@mantine/core';
import { IconTrash, IconPencil } from '@tabler/icons-react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

import useNotification from '@/hooks/useNotification';
import { usePermissions } from '@/hooks/usePermissions';
import { obfuscatePhone } from '@/utils/roleUtils';
import ProtectedAction from '@/components/ProtectedAction/ProtectedAction';

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
  const canEditPhone = can('canViewClientPhones');

  const [clientsList, setClientsList] = useState<Client[]>([]);
  const [editOpened, setEditOpened] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [form, setForm] = useState({ fullName: '', email: '', phoneNumber: '' });
  const [saving, setSaving] = useState(false);

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
    notify({ loading: true });
    try {
      await removeClient(clientId);
      setClientsList((prevClients) =>
        prevClients.filter((client) => client._id !== clientId)
      );
      notify({ message: 'Se elimino el cliente correctamente' });
    } catch (err) {
      console.error('Error en la solicitud', err);
      notify({ type: 'defaultError' });
      throw err;
    }
  };

  const openEdit = (client: Client) => {
    setEditing(client);
    setForm({
      fullName: client.fullName || '',
      email: client.email || '',
      phoneNumber: client.phoneNumber || ''
    });
    setEditOpened(true);
  };

  const saveEdit = async () => {
    if (!editing) return;
    setSaving(true);
    notify({ loading: true });
    try {
      const payload: any = {
        _id: editing._id,
        fullName: form.fullName,
        email: form.email
      };
      // El teléfono solo se manda si el rol puede verlo (si no, el back lo ignora igual)
      if (canEditPhone) payload.phoneNumber = form.phoneNumber;

      const res = await updateClient(payload);
      const updated = res.client || payload;

      setClientsList((prev) =>
        prev
          .map((c) => (c._id === editing._id ? { ...c, ...updated } : c))
          .sort((a, b) =>
            (a.fullName || '').localeCompare(b.fullName || '', 'es', {
              sensitivity: 'base'
            })
          )
      );
      setEditOpened(false);
      notify({ message: 'Cliente actualizado correctamente' });
    } catch (err) {
      console.error('Error actualizando cliente', err);
      notify({ type: 'defaultError' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Text size='xl' fw={700} mb='md'>
        Clientes
      </Text>
      <Box
        style={{
          flex: 1,
          overflow: 'auto',
          overflowX: 'auto',
          width: '100%'
        }}
      >
        <Table>
          <TableThead>
            <TableTr>
              <TableTh>Nombre</TableTh>
              <TableTh>Email</TableTh>
              <TableTh>Telefono</TableTh>
              <TableTh style={{ textAlign: 'center' }}>Acciones</TableTh>
            </TableTr>
          </TableThead>
          <TableTbody>
            {clientsList.length ? (
              clientsList.map((client) => (
                <TableTr key={client._id}>
                  <TableTd>{client.fullName}</TableTd>
                  <TableTd>{client.email}</TableTd>
                  <TableTd>
                    {obfuscatePhone(client.phoneNumber, role, 'client')}
                  </TableTd>
                  <TableTd style={{ textAlign: 'center' }}>
                    <Group gap='xs' justify='center' wrap='nowrap'>
                      <ProtectedAction
                        requiredPermission='canEditClients'
                        disableInsteadOfHide={true}
                        showTooltip={true}
                        tooltipMessage='No tienes permisos para editar clientes'
                      >
                        <ActionIcon
                          variant='subtle'
                          color='blue'
                          onClick={() => openEdit(client)}
                        >
                          <IconPencil size={18} />
                        </ActionIcon>
                      </ProtectedAction>
                      <ProtectedAction
                        requiredPermission='canDeleteClients'
                        disableInsteadOfHide={true}
                        showTooltip={true}
                        tooltipMessage='No tienes permisos para eliminar clientes'
                      >
                        <ActionIcon
                          variant='subtle'
                          color='red'
                          onClick={() => handleRemoveClient(client._id)}
                        >
                          <IconTrash size={18} />
                        </ActionIcon>
                      </ProtectedAction>
                    </Group>
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
      </Box>

      <Modal
        opened={editOpened}
        onClose={() => setEditOpened(false)}
        title='Editar cliente'
        centered
      >
        <Stack gap='sm'>
          <TextInput
            label='Nombre'
            value={form.fullName}
            onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
          />
          <TextInput
            label='Email'
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          />
          <TextInput
            label='Teléfono'
            value={form.phoneNumber}
            onChange={(e) =>
              setForm((f) => ({ ...f, phoneNumber: e.target.value }))
            }
            disabled={!canEditPhone}
            description={
              !canEditPhone
                ? 'No tenés permiso para ver/editar el teléfono'
                : undefined
            }
          />
          <Group justify='flex-end' mt='sm'>
            <Button variant='default' onClick={() => setEditOpened(false)}>
              Cancelar
            </Button>
            <Button onClick={saveEdit} loading={saving}>
              Guardar
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Box>
  );
});

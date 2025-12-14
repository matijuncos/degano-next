'use client';
import { useState, useEffect } from 'react';
import {
  Button,
  Card,
  Checkbox,
  Flex,
  Text,
  Loader,
  Badge,
  Group,
  ColorSwatch,
  Stack,
  Alert,
  ActionIcon,
  Divider,
  Title
} from '@mantine/core';
import {
  IconBrandGoogle,
  IconCalendar,
  IconRefresh,
  IconAlertCircle,
  IconTrash,
  IconPlus
} from '@tabler/icons-react';
import { initializeGapiClientAndGetToken } from '@/lib/gapi';

export interface GoogleCalendar {
  id: string;
  summary: string;
  description?: string;
  backgroundColor: string;
  foregroundColor: string;
  primary: boolean;
  accessRole: string;
}

export interface GoogleAccount {
  email: string;
  accessToken: string;
  calendars: GoogleCalendar[];
}

interface GoogleCalendarManagerProps {
  onCalendarsChange: (calendarIds: string[], calendars: GoogleCalendar[]) => void;
  selectedCalendarIds: string[];
  initialAccounts?: GoogleAccount[];
  onAccountsChange?: (accounts: GoogleAccount[]) => void;
}

const gapiConfig = {
  apiKey: process.env.NEXT_PUBLIC_GAPICONFIG_APIKEY,
  clientId: process.env.NEXT_PUBLIC_GAPICONFIG_CLIENTID,
  discoveryDocs: [process.env.NEXT_PUBLIC_GOOGLE_DISCOVERY_DOCS],
  scope: process.env.NEXT_PUBLIC_GOOGLE_SCOPES
};

export default function GoogleCalendarManager({
  onCalendarsChange,
  selectedCalendarIds,
  initialAccounts = [],
  onAccountsChange
}: GoogleCalendarManagerProps) {
  const [accounts, setAccounts] = useState<GoogleAccount[]>(initialAccounts);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Notificar al padre cuando cambien las cuentas
  useEffect(() => {
    if (onAccountsChange) {
      onAccountsChange(accounts);
    }
  }, [accounts, onAccountsChange]);

  const handleAddAccount = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Forzar selección de cuenta para permitir elegir otra cuenta
      const token = await initializeGapiClientAndGetToken(gapiConfig, true);
      if (!token) {
        setError('No se pudo obtener el token de acceso');
        return;
      }

      // Obtener info de la cuenta y calendarios
      const response = await fetch('/api/getGoogleCalendars', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken: token })
      });

      if (!response.ok) {
        throw new Error('Failed to fetch calendars');
      }

      const data = await response.json();
      const calendars = data.calendars || [];

      // Obtener email del usuario
      const userInfoResponse = await fetch(
        'https://www.googleapis.com/oauth2/v2/userinfo',
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      const userInfo = await userInfoResponse.json();
      const email = userInfo.email;

      // Verificar si la cuenta ya está agregada
      if (accounts.some((acc) => acc.email === email)) {
        setError('Esta cuenta ya está conectada');
        return;
      }

      // Agregar nueva cuenta
      const newAccount: GoogleAccount = {
        email,
        accessToken: token,
        calendars
      };

      setAccounts([...accounts, newAccount]);
    } catch (err) {
      console.error('Error connecting to Google Calendar:', err);
      setError('Error al conectar con Google Calendar');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveAccount = (email: string) => {
    const updatedAccounts = accounts.filter((acc) => acc.email !== email);
    setAccounts(updatedAccounts);

    // Remover calendarios de esta cuenta de la selección
    const remainingCalendars = updatedAccounts.flatMap((acc) => acc.calendars);
    const remainingCalendarIds = remainingCalendars.map((cal) => cal.id);
    const newSelectedIds = selectedCalendarIds.filter((id) =>
      remainingCalendarIds.includes(id)
    );
    onCalendarsChange(newSelectedIds, remainingCalendars);
  };

  const handleRefreshAccount = async (email: string) => {
    const account = accounts.find((acc) => acc.email === email);
    if (!account) return;

    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/getGoogleCalendars', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken: account.accessToken })
      });

      if (!response.ok) {
        throw new Error('Failed to fetch calendars');
      }

      const data = await response.json();
      const updatedCalendars = data.calendars || [];

      // Actualizar la cuenta
      const updatedAccounts = accounts.map((acc) =>
        acc.email === email ? { ...acc, calendars: updatedCalendars } : acc
      );
      setAccounts(updatedAccounts);
    } catch (err) {
      console.error('Error refreshing calendars:', err);
      setError('Error al actualizar los calendarios');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCalendarToggle = (calendarId: string) => {
    const allCalendars = accounts.flatMap((acc) => acc.calendars);
    let newSelectedIds: string[];
    if (selectedCalendarIds.includes(calendarId)) {
      newSelectedIds = selectedCalendarIds.filter((id) => id !== calendarId);
    } else {
      newSelectedIds = [...selectedCalendarIds, calendarId];
    }
    onCalendarsChange(newSelectedIds, allCalendars);
  };

  const handleSelectAllForAccount = (email: string) => {
    const account = accounts.find((acc) => acc.email === email);
    if (!account) return;

    const accountCalendarIds = account.calendars.map((cal) => cal.id);
    const allCalendars = accounts.flatMap((acc) => acc.calendars);
    const newSelectedIds = [
      ...new Set([...selectedCalendarIds, ...accountCalendarIds])
    ];
    onCalendarsChange(newSelectedIds, allCalendars);
  };

  const handleDeselectAllForAccount = (email: string) => {
    const account = accounts.find((acc) => acc.email === email);
    if (!account) return;

    const accountCalendarIds = account.calendars.map((cal) => cal.id);
    const allCalendars = accounts.flatMap((acc) => acc.calendars);
    const newSelectedIds = selectedCalendarIds.filter(
      (id) => !accountCalendarIds.includes(id)
    );
    onCalendarsChange(newSelectedIds, allCalendars);
  };

  return (
    <Card withBorder padding='lg'>
      <Stack gap='md'>
        <Flex justify='space-between' align='center'>
          <Group>
            <IconBrandGoogle size={24} color='#4285F4' />
            <Title order={4}>Calendarios de Google</Title>
          </Group>
          {accounts.length > 0 && (
            <Badge color='green' variant='light'>
              {accounts.length} cuenta(s) conectada(s)
            </Badge>
          )}
        </Flex>

        {error && (
          <Alert
            icon={<IconAlertCircle size={16} />}
            title='Error'
            color='red'
            variant='light'
          >
            {error}
          </Alert>
        )}

        <Button
          leftSection={<IconPlus size={16} />}
          onClick={handleAddAccount}
          loading={isLoading}
          variant={accounts.length === 0 ? 'filled' : 'light'}
        >
          {accounts.length === 0
            ? 'Conectar con Google Calendar'
            : 'Agregar otra cuenta'}
        </Button>

        {accounts.length > 0 && (
          <Stack gap='lg'>
            {accounts.map((account) => {
              const accountCalendarIds = account.calendars.map((cal) => cal.id);
              const allSelected = accountCalendarIds.every((id) =>
                selectedCalendarIds.includes(id)
              );
              const someSelected = accountCalendarIds.some((id) =>
                selectedCalendarIds.includes(id)
              );

              return (
                <Card key={account.email} withBorder padding='md' bg='gray.0'>
                  <Stack gap='sm'>
                    <Flex justify='space-between' align='center'>
                      <Group>
                        <IconBrandGoogle size={20} color='#4285F4' />
                        <Text fw={500} size='sm'>
                          {account.email}
                        </Text>
                      </Group>
                      <Group gap='xs'>
                        <ActionIcon
                          variant='subtle'
                          color='blue'
                          onClick={() => handleRefreshAccount(account.email)}
                          loading={isLoading}
                        >
                          <IconRefresh size={16} />
                        </ActionIcon>
                        <ActionIcon
                          variant='subtle'
                          color='red'
                          onClick={() => handleRemoveAccount(account.email)}
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Group>
                    </Flex>

                    <Divider />

                    <Group gap='xs'>
                      <Button
                        variant='light'
                        size='xs'
                        onClick={() => handleSelectAllForAccount(account.email)}
                        disabled={allSelected || account.calendars.length === 0}
                      >
                        Seleccionar todos
                      </Button>
                      <Button
                        variant='light'
                        size='xs'
                        onClick={() =>
                          handleDeselectAllForAccount(account.email)
                        }
                        disabled={!someSelected}
                      >
                        Deseleccionar todos
                      </Button>
                    </Group>

                    {account.calendars.length > 0 ? (
                      <Stack gap='xs'>
                        {account.calendars.map((calendar) => (
                          <Card key={calendar.id} withBorder padding='sm' bg='white'>
                            <Flex justify='space-between' align='center'>
                              <Group gap='sm'>
                                <ColorSwatch
                                  color={calendar.backgroundColor}
                                  size={20}
                                />
                                <div>
                                  <Flex align='center' gap='xs'>
                                    <Text size='sm' fw={500}>
                                      {calendar.summary}
                                    </Text>
                                    {calendar.primary && (
                                      <Badge
                                        size='xs'
                                        variant='light'
                                        color='blue'
                                      >
                                        Principal
                                      </Badge>
                                    )}
                                  </Flex>
                                  {calendar.description && (
                                    <Text size='xs' c='dimmed'>
                                      {calendar.description}
                                    </Text>
                                  )}
                                </div>
                              </Group>
                              <Checkbox
                                checked={selectedCalendarIds.includes(
                                  calendar.id
                                )}
                                onChange={() => handleCalendarToggle(calendar.id)}
                              />
                            </Flex>
                          </Card>
                        ))}
                      </Stack>
                    ) : (
                      <Text size='sm' c='dimmed' ta='center'>
                        No se encontraron calendarios
                      </Text>
                    )}
                  </Stack>
                </Card>
              );
            })}
          </Stack>
        )}

        {selectedCalendarIds.length > 0 && (
          <Alert icon={<IconCalendar size={16} />} color='blue' variant='light'>
            {selectedCalendarIds.length} calendario(s) seleccionado(s)
          </Alert>
        )}
      </Stack>
    </Card>
  );
}

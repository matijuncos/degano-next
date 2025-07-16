'use client';
import { DataTable, DataTableSortStatus } from 'mantine-datatable';
import { useEffect, useState } from 'react';
import {
  ActionIcon,
  Button,
  Flex,
  Group,
  Modal,
  Select,
  Text,
  TextInput
} from '@mantine/core';
import {
  IconAlertTriangle,
  IconEdit,
  IconTrash,
  IconUsersPlus
} from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import { useDeganoCtx } from '@/context/DeganoContext';
import Loader from '@/components/Loader/Loader';
import { withPageAuthRequired } from '@auth0/nextjs-auth0/client';
import useNotification from '@/hooks/useNotification';
import { EmployeeModel } from '@/context/types';

export default withPageAuthRequired(function StaffPage() {
  const { loading, setLoading } = useDeganoCtx();
  const [sortStatus, setSortStatus] = useState<DataTableSortStatus<any>>({
    columnAccessor: 'name',
    direction: 'asc'
  });
  const [records, setRecords] = useState<EmployeeModel[]>([]);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [employeeId, setEmployeeId] = useState('');
  const notify = useNotification();
  const [newEmployeeModal, setNewEmployeeModal] = useState(false);
  const [newEmployee, setNewEmployee] = useState<EmployeeModel>({
    fullName: '',
    cardId: '',
    rol: '',
    license: '',
    licenseType: ''
  });

  enum actions {
    see = 'see',
    edit = 'edit',
    remove = 'remove'
  }

  useEffect(() => {
    const fetchEmployees = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/employees', { cache: 'no-store' });
        const data = await res.json();
        setRecords(data);
      } catch (err) {
        notify({ type: 'defaultError' });
      } finally {
        setLoading(false);
      }
    };

    fetchEmployees();
  }, []);

  const handleCreateOrUpdateEmployee = async () => {
    setLoading(true);
    notify({ loading: true });
    if (newEmployee.license === 'NO') {
      delete newEmployee.licenseType;
    }
    try {
      const res = await fetch('/api/employees', {
        method: newEmployee._id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEmployee)
      });

      if (!res.ok) throw new Error('Error en la operación');

      const updated = await res.json();
      notify({
        message: newEmployee._id ? 'Empleado actualizado' : 'Empleado creado'
      });
      setNewEmployeeModal(false);
      setNewEmployee({
        fullName: '',
        cardId: '',
        rol: '',
        license: '',
        licenseType: ''
      });

      setRecords((prev) => {
        if (newEmployee._id) {
          return prev.map((emp) => (emp._id === updated._id ? updated : emp));
        } else {
          return [...prev, updated];
        }
      });
    } catch (error) {
      console.error(error);
      notify({ type: 'defaultError' });
    } finally {
      setLoading(false);
    }
  };

  const removeEmployee = async () => {
    setShowConfirmationModal(false);
    setLoading(true);
    notify({ loading: true });
    try {
      const res = await fetch(`/api/employees?id=${employeeId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!res.ok) throw new Error('Error en la operación');
      const updated = await res.json();
      notify({ message: 'Se elimino el empleado correctamente' });
      setRecords((prev) => prev.filter((e) => e._id !== employeeId));
    } catch (error) {
      notify({ type: 'defaultError' });
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleEmployee = ({
    employee,
    action
  }: {
    employee: EmployeeModel;
    action: actions;
  }) => {
    if (action === actions.remove) {
      setShowConfirmationModal(true);
      employee._id && setEmployeeId(employee._id);
    } else if (action === actions.edit) {
      setNewEmployee(employee);
      setNewEmployeeModal(true);
      return;
    }
  };

  return (
    <>
      <Modal
        opened={newEmployeeModal}
        onClose={() => setNewEmployeeModal(false)}
        title={newEmployee._id ? 'Editar Empleado' : 'Nuevo Empleado'}
      >
        <Flex direction='column' gap='12px'>
          <TextInput
            label='Nombre completo'
            value={newEmployee.fullName}
            onChange={(e) =>
              setNewEmployee({
                ...newEmployee,
                fullName: e.currentTarget.value
              })
            }
          />
          <TextInput
            label='DNI'
            value={newEmployee.cardId}
            onChange={(e) =>
              setNewEmployee({ ...newEmployee, cardId: e.currentTarget.value })
            }
          />
          <TextInput
            label='Rol'
            value={newEmployee.rol}
            onChange={(e) =>
              setNewEmployee({ ...newEmployee, rol: e.currentTarget.value })
            }
          />
          <Select
            label='¿Tiene carnet?'
            data={['SI', 'NO']}
            value={newEmployee.license}
            onChange={(value) =>
              setNewEmployee({
                ...newEmployee,
                license: value || '',
                licenseType: ''
              })
            }
          />

          {newEmployee.license === 'SI' && (
            <TextInput
              label='Tipo de carnet'
              value={newEmployee.licenseType}
              onChange={(e) =>
                setNewEmployee({
                  ...newEmployee,
                  licenseType: e.currentTarget.value
                })
              }
            />
          )}

          <Button onClick={handleCreateOrUpdateEmployee}>
            {newEmployee._id ? 'Actualizar' : 'Crear'}
          </Button>
        </Flex>
      </Modal>
      <Modal
        opened={showConfirmationModal}
        onClose={() => setShowConfirmationModal(false)}
        title='¿Seguro que quiere eliminar este empleado?'
      >
        <Flex direction='column' align='center' gap='16px'>
          <IconAlertTriangle size={80} />
          <Button w='100%' variant='gradient' onClick={() => removeEmployee()}>
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
            Empleados
          </Text>
          <Flex justify='flex-end' mb='md'>
            <Flex align='flex-end' mb='18px' gap='12px'>
              <Flex
                align='center'
                gap='6px'
                style={{ cursor: 'pointer' }}
                onClick={() => setNewEmployeeModal(true)}
              >
                Agregar empleado
                <IconUsersPlus color='green' />
              </Flex>
            </Flex>
          </Flex>
          <DataTable
            style={{ height: 'auto' }}
            highlightOnHover
            rowColor={({ date }) => {
              const now = new Date();
              if (now <= new Date(date)) return 'green';
              return 'grey';
            }}
            columns={[
              { accessor: 'fullName', title: 'Nombre' },
              { accessor: 'cardId', title: 'DNI' },
              { accessor: 'rol', title: 'Rol' },
              {
                accessor: 'license',
                title: 'Carnet',
                render: (employee) => (employee.license === 'SI' ? 'SI' : 'NO')
              },
              { accessor: 'licenseType', title: 'Tipo de carnet' },
              {
                accessor: 'actions',
                title: 'Acciones',
                render: (employee) => (
                  <Group gap={4} justify='left' wrap='nowrap'>
                    <ActionIcon
                      size='sm'
                      variant='subtle'
                      color='green'
                      onClick={() =>
                        handleEmployee({ employee, action: actions.edit })
                      }
                    >
                      <IconEdit size={16} />
                    </ActionIcon>

                    <ActionIcon
                      size='sm'
                      variant='subtle'
                      color='red'
                      onClick={() =>
                        handleEmployee({ employee, action: actions.remove })
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
        </>
      )}
    </>
  );
});

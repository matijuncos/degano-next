import { useState, useEffect } from 'react';
import { EventModel } from '@/context/types';
import { Button, Select, Stack, Text, Card, Group, ActionIcon } from '@mantine/core';
import { IconTrash, IconPlus } from '@tabler/icons-react';
import { EVENT_TABS } from '@/context/config';

interface StaffMember {
  employeeId: string;
  employeeName: string;
  rol: string;
}

const StaffForm = ({
  event,
  onNextTab,
  onBackTab,
  updateEvent,
  goToFiles
}: {
  event: EventModel;
  onNextTab: Function;
  onBackTab: Function;
  updateEvent?: Function;
  goToFiles?: boolean;
}) => {
  const [eventData, setEventData] = useState<EventModel>(event);
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>(
    event.staff || []
  );

  // Fetch employees
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const response = await fetch('/api/employees');
        const data = await response.json();
        setEmployees(Array.isArray(data) ? data : data.employees || []);
      } catch (error) {
        console.error('Error fetching employees:', error);
      }
    };
    fetchEmployees();
  }, []);

  // Sincronizar estado local con el prop event cuando el usuario navega
  useEffect(() => {
    if (event) {
      setEventData(event);
      setStaffMembers(event.staff || []);
    }
  }, [event]);

  // Sync staff with eventData
  useEffect(() => {
    setEventData((prev) => ({ ...prev, staff: staffMembers }));
  }, [staffMembers]);

  const handleAddStaff = () => {
    if (!selectedEmployee) return;

    const employee = employees.find((emp) => emp._id === selectedEmployee);
    if (!employee) return;

    // Check if already added
    const alreadyAdded = staffMembers.some(
      (member) => member.employeeId === employee._id
    );
    if (alreadyAdded) {
      alert('Este empleado ya está en el staff');
      return;
    }

    const newStaffMember: StaffMember = {
      employeeId: employee._id,
      employeeName: employee.fullName,
      rol: employee.rol || 'Sin rol'
    };

    setStaffMembers((prev) => [...prev, newStaffMember]);
    setSelectedEmployee(null);
  };

  const handleRemoveStaff = (index: number) => {
    setStaffMembers((prev) => prev.filter((_, i) => i !== index));
  };

  const next = () => {
    if (updateEvent) {
      updateEvent(eventData);
    }
    onNextTab(goToFiles ? EVENT_TABS.FILES : EVENT_TABS.PAYMENT, eventData);
  };

  const back = () => {
    if (updateEvent) {
      updateEvent(eventData);
    }
    onBackTab(EVENT_TABS.EQUIPMENT, eventData);
  };

  return (
    <>
      <Stack gap='md'>
        <Group>
          <Select
            placeholder='Seleccionar empleado'
            data={employees.map((emp) => ({
              value: emp._id,
              label: `${emp.fullName} - ${emp.rol || 'Sin rol'}`
            }))}
            value={selectedEmployee}
            onChange={setSelectedEmployee}
            searchable
            style={{ flex: 1 }}
          />
          <Button
            leftSection={<IconPlus size={16} />}
            onClick={handleAddStaff}
            disabled={!selectedEmployee}
          >
            Agregar
          </Button>
        </Group>

        {staffMembers.length > 0 && (
          <Stack gap='xs'>
            <Text fw={500}>Staff asignado:</Text>
            {staffMembers.map((member, index) => (
              <Card key={index} withBorder p='xs'>
                <Group justify='space-between'>
                  <div>
                    <Text size='sm' fw={500}>{member.employeeName}</Text>
                    <Text size='xs' c='dimmed'>{member.rol}</Text>
                  </div>
                  <ActionIcon
                    color='red'
                    variant='subtle'
                    onClick={() => handleRemoveStaff(index)}
                  >
                    <IconTrash size={16} />
                  </ActionIcon>
                </Group>
              </Card>
            ))}
          </Stack>
        )}
      </Stack>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '20px' }}>
        <Button onClick={back}>Atrás</Button>
        <Button onClick={next}>Siguiente</Button>
      </div>
    </>
  );
};

export default StaffForm;

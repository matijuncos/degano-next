'use client';
import { useDeganoCtx } from '@/context/DeganoContext';
import useLoadingCursor from '@/hooks/useLoadingCursor';
import {
  DrawerHeader,
  NavLink,
  Divider,
  Stack,
  Text,
  Title,
  Box,
  Group,
  Button,
  Modal,
  Select,
  Card,
  ActionIcon,
  Badge
} from '@mantine/core';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import {
  IconPlus,
  IconTrash,
  IconFile,
  IconFileMusic,
  IconVideo,
  IconPhoto,
  IconFileTypePdf,
  IconFileText,
  IconFileZip
} from '@tabler/icons-react';
import { Image } from '@mantine/core';
import { formatPrice } from '@/utils/priceUtils';
import useNotification from '@/hooks/useNotification';
import { findMainCategorySync } from '@/utils/categoryUtils';
import { format24Hour } from '@/utils/dateUtils';
import { getCleanFileName, getFileViewerUrl } from '@/utils/fileUtils';

interface FileItem {
  id: string;
  name: string;
  webViewLink: string;
  mimeType: string;
  [key: string]: any;
}

interface StaffMember {
  employeeId: string;
  employeeName: string;
  rol: string;
}

const DrawerContent = () => {
  const { selectedEvent, setSelectedEvent, folderName } = useDeganoCtx();
  const router = useRouter();
  const setLoadingCursor = useLoadingCursor();
  const notify = useNotification();
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [categories, setCategories] = useState<any[]>([]);

  const capitalizeFirstLetter = (string: string) => {
    return string.charAt(0).toUpperCase() + string.slice(1);
  };

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch('/api/categories');
        const data = await response.json();
        setCategories(data);
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    };
    fetchCategories();
  }, []);

  // Fetch employees for staff selection
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const response = await fetch('/api/employees');
        const data = await response.json();
        // La API devuelve el array directamente
        if (Array.isArray(data)) {
          setEmployees(data);
        } else if (data.employees) {
          setEmployees(data.employees);
        }
      } catch (error) {
        console.error('Error fetching employees:', error);
      }
    };
    fetchEmployees();
  }, []);

  // Load staff members from selectedEvent
  useEffect(() => {
    if (selectedEvent?.staff) {
      setStaffMembers(selectedEvent.staff);
    }
  }, [selectedEvent]);

  // Función para obtener el ícono según el tipo de archivo
  const getFileIcon = (mimeType: string, fileName: string) => {
    const size = 32;

    // Por MIME type
    if (mimeType?.startsWith('image/')) {
      return <IconPhoto size={size} />;
    }
    if (mimeType?.startsWith('video/')) {
      return <IconVideo size={size} />;
    }
    if (mimeType?.startsWith('audio/')) {
      return <IconFileMusic size={size} />;
    }
    if (mimeType === 'application/pdf') {
      return <IconFileTypePdf size={size} />;
    }

    // Por extensión de archivo
    const extension = fileName?.split('.').pop()?.toLowerCase();
    if (['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac'].includes(extension || '')) {
      return <IconFileMusic size={size} />;
    }
    if (['mp4', 'avi', 'mov', 'wmv', 'flv', 'mkv'].includes(extension || '')) {
      return <IconVideo size={size} />;
    }
    if (
      ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension || '')
    ) {
      return <IconPhoto size={size} />;
    }
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(extension || '')) {
      return <IconFileZip size={size} />;
    }
    if (['txt', 'doc', 'docx'].includes(extension || '')) {
      return <IconFileText size={size} />;
    }

    return <IconFile size={size} />;
  };

  // Función para obtener preview de archivos de banda
  const getBandFilePreview = (fileUrl: string) => {
    if (!fileUrl) return null;

    const isImage = /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(fileUrl);
    const isPdf = /\.pdf$/i.test(fileUrl);
    const cleanName = getCleanFileName(fileUrl);

    return (
      <Box
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          cursor: 'pointer',
          maxWidth: '80px',
          gap: '4px'
        }}
        onClick={() => window.open(getFileViewerUrl(fileUrl), '_blank')}
      >
        <Card
          withBorder
          padding='xs'
          style={{
            width: '60px',
            height: '60px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'transform 0.2s, box-shadow 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.05)';
            e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '';
          }}
        >
          {isImage ? (
            <Image
              src={fileUrl}
              alt='Band file'
              fit='cover'
              style={{ width: '100%', height: '100%', borderRadius: '4px' }}
            />
          ) : isPdf ? (
            <IconFileTypePdf size={32} color='#FF0000' />
          ) : (
            <IconFile size={32} color='#888888' />
          )}
        </Card>
        <Text
          size='xs'
          style={{
            textAlign: 'center',
            wordBreak: 'break-word',
            fontSize: '10px',
            lineHeight: '1.2'
          }}
        >
          {cleanName}
        </Text>
      </Box>
    );
  };

  // Fetch de archivos usando la API
  useEffect(() => {
    const fetchFiles = async () => {
      if (!folderName || folderName === 'untitled') return;

      setLoadingFiles(true);
      try {
        const response = await fetch('/api/listGoogleDriveFiles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ folderName })
        });

        if (response.ok) {
          const data = await response.json();
          setFiles(data.files || []);
        }
      } catch (error) {
        console.error('Error fetching files:', error);
      } finally {
        setLoadingFiles(false);
      }
    };

    fetchFiles();
  }, [folderName]);

  const handleAddStaff = async () => {
    if (!selectedEmployee) {
      notify({
        type: 'defaultError',
        message: 'Por favor selecciona un empleado'
      });
      return;
    }

    const employee = employees.find((emp) => emp._id === selectedEmployee);
    if (!employee) return;

    // Verificar si el empleado ya está en el staff
    const alreadyAdded = staffMembers.some(
      (member) => member.employeeId === employee._id
    );
    if (alreadyAdded) {
      notify({
        type: 'defaultError',
        message: 'Este empleado ya está en el staff'
      });
      return;
    }

    const newStaffMember: StaffMember = {
      employeeId: employee._id,
      employeeName: employee.fullName,
      rol: employee.rol || 'Sin rol'
    };

    const updatedStaff = [...staffMembers, newStaffMember];
    setStaffMembers(updatedStaff);

    // Update event in database
    try {
      setLoadingCursor(true);
      const response = await fetch('/api/updateEvent', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          _id: selectedEvent?._id,
          staff: updatedStaff
        })
      });

      const { event } = await response.json();
      setSelectedEvent(event);
      setIsStaffModalOpen(false);
      setSelectedEmployee(null);
      notify({ message: 'Staff agregado correctamente' });
    } catch (error) {
      notify({ type: 'defaultError' });
      console.error('Error adding staff:', error);
    } finally {
      setLoadingCursor(false);
    }
  };

  const handleRemoveStaff = async (index: number) => {
    const updatedStaff = staffMembers.filter((_, i) => i !== index);
    setStaffMembers(updatedStaff);

    try {
      setLoadingCursor(true);
      const response = await fetch('/api/updateEvent', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          _id: selectedEvent?._id,
          staff: updatedStaff
        })
      });

      const { event } = await response.json();
      setSelectedEvent(event);
      notify({ message: 'Staff eliminado correctamente' });
    } catch (error) {
      notify({ type: 'defaultError' });
      console.error('Error removing staff:', error);
    } finally {
      setLoadingCursor(false);
    }
  };

  console.log('selectedEvent:', selectedEvent);

  // Group equipment by main category
  const groupedEquipment =
    selectedEvent?.equipment?.reduce((acc: any, eq: any) => {
      let mainCategoryName = eq.mainCategoryName;

      // Si no tiene mainCategoryName, calcularlo usando la función recursiva
      if (!mainCategoryName && eq.categoryId && categories.length > 0) {
        const mainCategory = findMainCategorySync(eq.categoryId, categories);
        mainCategoryName = mainCategory?.name || 'Sin categoría';
      }

      // Fallback si aún no hay nombre
      if (!mainCategoryName) {
        mainCategoryName = 'Sin categoría';
      }

      if (!acc[mainCategoryName]) {
        acc[mainCategoryName] = [];
      }
      acc[mainCategoryName].push(eq);
      return acc;
    }, {}) || {};

  return (
    <>
      {/* HEADER PRINCIPAL */}
      <DrawerHeader>
        <Title order={2}>
          {selectedEvent?.type} - {selectedEvent?.lugar} <br />
          {selectedEvent?.company ? (
            <Text size='xl' mt='10px'>Empresa: {selectedEvent.company}</Text>
          ) : (
            ''
          )}
        </Title>
      </DrawerHeader>

      <Stack gap='xl' style={{ padding: '0 16px', marginBottom: '20px' }}>
        {/* FECHA */}
        <Text size='sm' c='dimmed'>
          {selectedEvent?.start
            ? capitalizeFirstLetter(
                new Date(selectedEvent.start).toLocaleDateString('es-AR', {
                  weekday: 'long',
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric'
                })
              )
            : 'N/A'}
        </Text>

        <Divider />

        {/* SECCIÓN: HORARIOS */}
        <Box>
          <Text fw={700} size='md' mb='sm'>
            Horarios
          </Text>
          <Stack gap='xs'>
            {/* Horario de inicio */}
            {selectedEvent?.start && (
              <Text size='sm'>
                <strong>Horario de inicio:</strong>{' '}
                {format24Hour(selectedEvent.start)}
              </Text>
            )}

            {/* Horario de finalización */}
            {selectedEvent?.end && (
              <Text size='sm'>
                <strong>Horario de finalización:</strong>{' '}
                {format24Hour(selectedEvent.end)}
              </Text>
            )}

            {/* Horario de civil */}
            {selectedEvent?.civil && (
              <Text size='sm'>
                <strong>Horario de civil:</strong>{' '}
                {format24Hour(selectedEvent.civil)}
              </Text>
            )}

            {/* Horario de Iglesia */}
            {selectedEvent?.churchDate && (
              <Text size='sm'>
                <strong>Horario de Iglesia:</strong>{' '}
                {format24Hour(selectedEvent.churchDate)}
              </Text>
            )}

            {/* Horario de llegada Staff */}
            {selectedEvent?.staffArrivalTime && (
              <Text size='sm'>
                <strong>Horario de llegada Staff:</strong>{' '}
                {format24Hour(selectedEvent.staffArrivalTime)}
              </Text>
            )}

            {/* Horario de llegada equipamiento */}
            {selectedEvent?.equipmentArrivalTime && (
              <Text size='sm'>
                <strong>Horario de llegada equipamiento:</strong>{' '}
                {format24Hour(selectedEvent.equipmentArrivalTime)}
              </Text>
            )}
          </Stack>
        </Box>

        <Divider />

        {/* SECCIÓN: CANTIDAD DE PERSONAS */}
        <Box>
          <Text fw={700} size='md' mb='sm'>
            Cantidad de personas
          </Text>
          <Text size='sm'>{selectedEvent?.guests || '-'}</Text>
        </Box>

        <Divider />

        {/* SECCIÓN: CLIENTE */}
        <Box>
          <Text fw={700} size='md' mb='sm'>
            Cliente
          </Text>
          <Text size='sm'>
            {selectedEvent?.fullName}: {selectedEvent?.phoneNumber}
          </Text>
          <Text size='sm'>Rol: {selectedEvent?.rol}</Text>
          {selectedEvent?.email && (
            <Text size='sm' c='dimmed'>
              Mail: {selectedEvent.email}
            </Text>
          )}

          {/* CLIENTES EXTRAS */}
          {selectedEvent?.extraClients &&
            selectedEvent.extraClients.length > 0 && (
              <Stack gap='xs' mt='md'>
                {selectedEvent.extraClients.map((client, index) => (
                  <Box key={index}>
                    <Text size='sm'>
                      {client.fullName}: {client.phoneNumber}
                    </Text>
                    <Text size='xs' c='dimmed'>
                      Rol: {client.rol}
                    </Text>
                  </Box>
                ))}
              </Stack>
            )}
        </Box>

        <Divider />

        {/* SECCIÓN: STAFF */}
        <Box>
          <Group justify='space-between' mb='sm'>
            <Text fw={700} size='md'>
              Staff
            </Text>
            <Button
              variant='light'
              size='xs'
              leftSection={<IconPlus size={14} />}
              onClick={() => setIsStaffModalOpen(true)}
            >
              Agregar
            </Button>
          </Group>
          {staffMembers.length > 0 ? (
            <Stack gap='xs'>
              {staffMembers.map((member, index) => (
                <Group key={index} justify='space-between'>
                  <Box>
                    <Text size='sm' fw={500}>
                      {member.rol} - {member.employeeName}
                    </Text>
                  </Box>
                  <ActionIcon
                    color='red'
                    variant='subtle'
                    onClick={() => handleRemoveStaff(index)}
                  >
                    <IconTrash size={16} />
                  </ActionIcon>
                </Group>
              ))}
            </Stack>
          ) : (
            <Text size='sm' c='dimmed'>
              No hay staff asignado
            </Text>
          )}
        </Box>

        <Divider />

        {/* SECCIÓN: PRESUPUESTO */}
        <Box>
          <Text fw={700} size='md' mb='sm'>
            Presupuesto
          </Text>
          {selectedEvent?.payment?.totalToPay != null && (
            <Text size='sm' mb='xs'>
              Total a pagar:{' '}
              {formatPrice(Number(selectedEvent.payment.totalToPay))}
            </Text>
          )}
          {selectedEvent?.equipmentPrice != null && (
            <Text size='sm' mb='xs'>
              Equipamiento: {formatPrice(Number(selectedEvent.equipmentPrice))}
            </Text>
          )}

          <Divider
            variant='dashed'
            size='sm'
            my='md'
            style={{ borderColor: '#C9C9C9' }}
          />

          <Text size='sm' fw={500} mb='xs'>
            Pagos realizados:
          </Text>
          {selectedEvent?.payment?.upfrontAmount && (
            <Text size='sm' pl='md'>
              - Adelanto:{' '}
              {formatPrice(Number(selectedEvent.payment.upfrontAmount))}
            </Text>
          )}
          {selectedEvent?.payment?.subsequentPayments &&
            selectedEvent.payment.subsequentPayments.map(
              (payment: any, idx: number) => (
                <Text key={idx} size='sm' pl='md'>
                  - {payment.description || 'Pago'}:{' '}
                  {formatPrice(Number(payment.amount))}
                </Text>
              )
            )}

          <Divider
            variant='dashed'
            size='sm'
            my='md'
            style={{ borderColor: '#C9C9C9' }}
          />

          <Text size='sm' fw={500}>
            Falta pagar:{' '}
            {formatPrice(
              Number(selectedEvent?.payment.totalToPay) -
                ((selectedEvent?.payment.subsequentPayments?.reduce(
                  (sum: number, payment: any) => sum + Number(payment.amount),
                  0
                ) || 0) +
                  Number(selectedEvent?.payment.upfrontAmount))
            )}
          </Text>
        </Box>

        <Divider />

        {/* SECCIÓN: EQUIPAMIENTO */}
        <Box>
          <Text fw={700} size='md' mb='sm'>
            Equipamiento
          </Text>
          {Object.keys(groupedEquipment).length > 0 ? (
            <Stack gap='md'>
              {Object.keys(groupedEquipment).map((category) => (
                <Box key={category}>
                  <Text fw={500} size='sm' tt='uppercase' mb='xs'>
                    {category}:
                  </Text>
                  <Stack gap={4} pl='md'>
                    {groupedEquipment[category].map((eq: any, idx: number) => (
                      <Text key={idx} size='sm'>
                        Cant: {eq.quantity || 1} - {eq.name}
                      </Text>
                    ))}
                  </Stack>
                </Box>
              ))}
            </Stack>
          ) : (
            <Text size='sm' c='dimmed'>
              No hay equipamiento asignado
            </Text>
          )}
        </Box>

        <Divider />

        {/* SECCIÓN: SHOW EN VIVO */}
        <Box>
          <Text fw={700} size='md' mb='sm'>
            Show en vivo
          </Text>
          {selectedEvent?.bands && selectedEvent.bands.length > 0 ? (
            <Stack gap='md'>
              {selectedEvent.bands.map((band, index) => {
                // Combinar fileUrl singular (legacy) con fileUrls array
                const allFiles = [
                  ...((band as any).fileUrl ? [(band as any).fileUrl] : []),
                  ...(band.fileUrls || [])
                ];
                // Remover duplicados
                const uniqueFiles = [...new Set(allFiles)];

                return (
                  <Card key={index} withBorder padding='sm'>
                    <Group align='flex-start' gap='md' wrap='nowrap'>
                      {uniqueFiles.length > 0 && (
                        <Group gap='xs'>
                          {uniqueFiles.map((fileUrl, idx) => (
                            <div key={idx}>{getBandFilePreview(fileUrl)}</div>
                          ))}
                        </Group>
                      )}
                      <Box style={{ flex: 1 }}>
                        <Text fw={500} mb='xs'>
                          {band.bandName}
                        </Text>
                        {band.showTime && (
                          <Text size='sm' c='dimmed' mb='xs'>
                            Horario: {band.showTime}
                          </Text>
                        )}
                        {band.testTime && (
                          <Text size='sm' c='dimmed' mb='xs'>
                            Prueba de sonido: {band.testTime}
                          </Text>
                        )}
                        {band.bandInfo && (
                          <Text size='sm' mb='xs'>
                            {band.bandInfo}
                          </Text>
                        )}
                        {band.contacts && band.contacts.length > 0 && (
                          <Box mt='xs'>
                            <Text size='xs' fw={500}>
                              Contactos:
                            </Text>
                            {band.contacts.map((contact, idx) => (
                              <Text key={idx} size='xs'>
                                • {contact.name} - {contact.rol} -{' '}
                                {contact.phone}
                              </Text>
                            ))}
                          </Box>
                        )}
                      </Box>
                    </Group>
                  </Card>
                );
              })}
            </Stack>
          ) : (
            <Text size='sm' c='dimmed'>
              No hay shows en vivo programados
            </Text>
          )}
        </Box>

        <Divider />

        {/* SECCIÓN: ARCHIVOS */}
        <Box>
          <Text fw={700} size='md' mb='sm'>
            Archivos
          </Text>
          {loadingFiles ? (
            <Text size='sm' c='dimmed'>
              Cargando archivos...
            </Text>
          ) : files.length > 0 ? (
            <Group gap='sm'>
              {files.map((file) => (
                <Card
                  key={file.id}
                  withBorder
                  padding='xs'
                  style={{
                    cursor: 'pointer',
                    width: '80px',
                    transition: 'transform 0.1s, box-shadow 0.1s'
                  }}
                  onClick={() => {
                    if (file.webViewLink) {
                      window.open(file.webViewLink, '_blank');
                    }
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.05)';
                    e.currentTarget.style.boxShadow =
                      '0 4px 8px rgba(0,0,0,0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = '';
                  }}
                >
                  <Stack align='center' gap={4}>
                    {getFileIcon(file.mimeType, file.name)}
                    <Text
                      size='xs'
                      ta='center'
                      style={{
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        width: '100%'
                      }}
                    >
                      {file.name}
                    </Text>
                  </Stack>
                </Card>
              ))}
            </Group>
          ) : (
            <Text size='sm' c='dimmed'>
              No hay archivos adjuntos
            </Text>
          )}
        </Box>

        <Divider />

        {/* BOTÓN VER EVENTO */}
        <Button
          fullWidth
          size='md'
          onClick={() => {
            setLoadingCursor(true);
            // Obtener la ruta actual y los parámetros de búsqueda para poder volver
            const currentPath = window.location.pathname;
            const currentSearch = window.location.search;
            const fullPath = currentPath + currentSearch;
            router.push(
              `/event/${selectedEvent?._id}?from=${encodeURIComponent(
                fullPath
              )}`
            );
          }}
        >
          Ver Evento Completo
        </Button>
      </Stack>

      {/* MODAL: AGREGAR STAFF */}
      <Modal
        opened={isStaffModalOpen}
        onClose={() => {
          setIsStaffModalOpen(false);
          setSelectedEmployee(null);
        }}
        title='Agregar Staff'
      >
        <Stack gap='md'>
          <Select
            label='Empleado'
            placeholder='Seleccionar empleado'
            data={employees.map((emp) => ({
              value: emp._id,
              label: `${emp.rol || 'Sin rol'} - ${emp.fullName}`
            }))}
            value={selectedEmployee}
            onChange={setSelectedEmployee}
            searchable
          />
          <Text size='sm' c='dimmed'>
            El rol se asignará automáticamente según el rol del empleado en la
            base de datos.
          </Text>
          <Group justify='flex-end'>
            <Button
              variant='light'
              onClick={() => {
                setIsStaffModalOpen(false);
                setSelectedEmployee(null);
              }}
            >
              Cancelar
            </Button>
            <Button onClick={handleAddStaff}>Agregar</Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
};
export default DrawerContent;

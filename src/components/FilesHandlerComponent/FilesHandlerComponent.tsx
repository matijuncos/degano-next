'use client';
import '@mantine/dropzone/styles.css';
import { Box, Button, Flex, Loader } from '@mantine/core';
import { Group, Text, rem } from '@mantine/core';
import {
  IconUpload,
  IconPhoto,
  IconTrash,
  IconFile,
  IconFileMusic,
  IconVideo,
  IconFileTypePdf,
  IconFileText,
  IconFileZip,
  IconDownload
} from '@tabler/icons-react';
import { Dropzone } from '@mantine/dropzone';
import { useEffect, useState } from 'react';
import { useDeganoCtx } from '@/context/DeganoContext';
import useNotification from '@/hooks/useNotification';
import { usePermissions } from '@/hooks/usePermissions';

interface EventFile {
  url: string;
  name: string;
  mimeType: string;
  uploadedAt: string;
}

interface LoadingState {
  fetchingFiles: boolean;
  uploading: boolean;
  deletingFile: string | null;
}

export default function FilesHandlerComponent() {
  const { can } = usePermissions();
  const canUploadFiles = can('canUploadFiles');
  const canDeleteFiles = can('canDeleteFiles');
  const { selectedEvent, setSelectedEvent } = useDeganoCtx();
  const notify = useNotification();
  const [allFiles, setAllfiles] = useState<File[]>([]);
  const [showUploadSection, setShowUploadSection] = useState(false);
  const [loading, setLoading] = useState<LoadingState>({
    fetchingFiles: false,
    uploading: false,
    deletingFile: null
  });

  // Archivos del evento (guardados en MongoDB)
  const files: EventFile[] = selectedEvent?.files || [];

  // Función para obtener el ícono según el tipo de archivo
  const getFileIcon = (mimeType: string, fileName: string) => {
    const size = 20;

    if (mimeType?.startsWith('image/')) return <IconPhoto size={size} />;
    if (mimeType?.startsWith('video/')) return <IconVideo size={size} />;
    if (mimeType?.startsWith('audio/')) return <IconFileMusic size={size} />;
    if (mimeType === 'application/pdf') return <IconFileTypePdf size={size} />;

    const extension = fileName?.split('.').pop()?.toLowerCase();
    if (['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac'].includes(extension || '')) return <IconFileMusic size={size} />;
    if (['mp4', 'avi', 'mov', 'wmv', 'flv', 'mkv'].includes(extension || '')) return <IconVideo size={size} />;
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension || '')) return <IconPhoto size={size} />;
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(extension || '')) return <IconFileZip size={size} />;
    if (['txt', 'doc', 'docx'].includes(extension || '')) return <IconFileText size={size} />;

    return <IconFile size={size} />;
  };

  const handleUploadClick = async () => {
    if (allFiles.length === 0 || !selectedEvent?._id) return;

    setLoading((prev) => ({ ...prev, uploading: true }));
    notify({ loading: true });

    try {
      const uploadedFiles: EventFile[] = [];

      for (const file of allFiles) {
        // 1. Obtener presigned URL de S3
        const presignRes = await fetch('/api/uploadToS3', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: file.name,
            fileType: file.type,
            bucket: 'events'
          })
        });

        if (!presignRes.ok) throw new Error(`Error obteniendo URL para ${file.name}`);
        const { signedUrl, url } = await presignRes.json();

        // 2. Subir directo a S3 (sin límite de tamaño, sin pasar por Vercel)
        const uploadRes = await fetch(signedUrl, {
          method: 'PUT',
          headers: { 'Content-Type': file.type },
          body: file
        });

        if (!uploadRes.ok) throw new Error(`Error subiendo ${file.name}`);

        uploadedFiles.push({
          url,
          name: file.name,
          mimeType: file.type,
          uploadedAt: new Date().toISOString()
        });
      }

      // 3. Guardar referencias en el evento (MongoDB)
      const updatedFiles = [...files, ...uploadedFiles];
      const saveRes = await fetch('/api/updateEvent', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...selectedEvent,
          files: updatedFiles
        })
      });

      if (!saveRes.ok) throw new Error('Error guardando archivos en el evento');

      const data = await saveRes.json();
      setSelectedEvent(data.event || { ...selectedEvent, files: updatedFiles });

      setAllfiles([]);
      notify({ message: 'Archivos subidos correctamente' });
    } catch (error) {
      console.error('Error uploading files:', error);
      notify({ type: 'defaultError', message: 'Error al subir archivos' });
    } finally {
      setLoading((prev) => ({ ...prev, uploading: false }));
    }
  };

  const handleDeleteFile = async (fileUrl: string, fileName: string) => {
    if (!confirm(`¿Eliminar "${fileName}"?`)) return;
    if (!selectedEvent?._id) return;

    setLoading((prev) => ({ ...prev, deletingFile: fileUrl }));
    try {
      // 1. Eliminar de S3
      await fetch('/api/deleteFromS3', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: fileUrl, bucket: 'events' })
      });

      // 2. Actualizar evento en MongoDB
      const updatedFiles = files.filter((f) => f.url !== fileUrl);
      const saveRes = await fetch('/api/updateEvent', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...selectedEvent,
          files: updatedFiles
        })
      });

      if (saveRes.ok) {
        const data = await saveRes.json();
        setSelectedEvent(data.event || { ...selectedEvent, files: updatedFiles });
      }

      notify({ message: 'Archivo eliminado' });
    } catch (error) {
      console.error('Error deleting file:', error);
      notify({ type: 'defaultError', message: 'Error al eliminar archivo' });
    } finally {
      setLoading((prev) => ({ ...prev, deletingFile: null }));
    }
  };

  return (
    <>
      {typeof window !== 'undefined' && (
        <>
          {canUploadFiles && (
            <Button
              onClick={() => setShowUploadSection((prev) => !prev)}
              w='100%'
              my='18px'
            >
              {showUploadSection
                ? 'Ocultar sección de carga de archivos'
                : 'Mostrar sección de carga de archivos'}
            </Button>
          )}

          {showUploadSection && (
            <>
              <Flex w='100%'>
                <Dropzone
                  multiple
                  onDrop={(droppedFiles) => setAllfiles((prev) => [...prev, ...droppedFiles])}
                  onReject={(rejectedFiles) => {
                    alert(`Archivos rechazados: ${rejectedFiles.map(f => f.file.name).join(', ')}. Verifica que no excedan 100MB.`);
                  }}
                  maxSize={100 * 1024 ** 2}
                  accept={{
                    'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'],
                    'video/*': ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.mkv'],
                    'audio/*': ['.mp3', '.wav', '.ogg', '.flac', '.m4a', '.aac'],
                    'application/pdf': ['.pdf'],
                    'application/msword': ['.doc'],
                    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
                    'application/vnd.ms-excel': ['.xls'],
                    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
                    'text/*': ['.txt', '.csv']
                  }}
                  style={{ width: '100%', flex: 5 }}
                >
                  <Group
                    justify='center'
                    gap='xl'
                    mih={220}
                    style={{ pointerEvents: 'none' }}
                  >
                    {!allFiles.length ? (
                      <>
                        <Dropzone.Accept>
                          <IconUpload
                            style={{
                              width: rem(52),
                              height: rem(52),
                              color: 'var(--mantine-color-blue-6)'
                            }}
                            stroke={1.5}
                          />
                        </Dropzone.Accept>
                        <Dropzone.Idle>
                          <IconPhoto
                            style={{
                              width: rem(52),
                              height: rem(52),
                              color: 'var(--mantine-color-dimmed)'
                            }}
                            stroke={1.5}
                          />
                        </Dropzone.Idle>
                        <div>
                          <Text size='xl' inline>
                            Arrastra archivos o haz click
                          </Text>
                          <Text size='sm' c='dimmed' inline mt={7}>
                            Adjunta la cantidad de archivos que quieras (imágenes, videos, audio, PDFs, etc.). Cada
                            archivo no debe exceder los 100MB
                          </Text>
                        </div>
                      </>
                    ) : (
                      <div
                        style={{
                          display: 'flex',
                          gap: '22px',
                          width: '90%',
                          flexWrap: 'wrap',
                          justifyContent: 'flex-start',
                          alignItems: 'flex-start'
                        }}
                      >
                        {allFiles.map((file) => (
                          <div
                            key={file.name}
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              width: '120px',
                              justifyContent: 'flex-start',
                              flex: 1
                            }}
                          >
                            {getFileIcon(file.type, file.name)}
                            <div
                              style={{
                                width: '100px',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                              }}
                            >
                              {file.name}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </Group>
                </Dropzone>
                {!!allFiles.length && (
                  <Flex direction='column' p='18px' gap='8px' flex={1}>
                    {allFiles.map((file) => (
                      <Flex
                        key={file.name}
                        gap='16px'
                        justify='space-between'
                      >
                        <div
                          style={{
                            width: '150px',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}
                        >
                          {file.name}
                        </div>
                        <IconTrash
                          color='red'
                          style={{ cursor: 'pointer' }}
                          onClick={() =>
                            setAllfiles((prev) =>
                              prev.filter((f) => f.name !== file.name)
                            )
                          }
                        />
                      </Flex>
                    ))}
                  </Flex>
                )}
              </Flex>

              <Button
                disabled={allFiles.length === 0 || loading.uploading}
                mt='18px'
                w='100%'
                onClick={handleUploadClick}
                leftSection={
                  loading.uploading && <Loader size='sm' color='white' />
                }
              >
                {loading.uploading ? 'Subiendo...' : 'Subir Archivos'}
              </Button>
              <Box py='24px'>
                <hr />
              </Box>
            </>
          )}

          <Flex direction='column' gap='12px' align='flex-start' pb='100px'>
            <h2>Archivos del evento</h2>
            {files.length === 0 ? (
              <Text size='sm' c='dimmed'>No hay archivos subidos.</Text>
            ) : (
              files.map((file) => (
                <Flex
                  gap='12px'
                  key={file.url}
                  justify='space-between'
                  align='center'
                  p='12px 18px'
                  flex={1}
                  w='100%'
                  maw='450px'
                  style={{
                    border: 'solid 1px rgba(180, 180, 180, 0.3)',
                    borderRadius: '6px',
                    width: '100%',
                    maxWidth: '450px',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s, transform 0.1s'
                  }}
                  onClick={() => window.open(file.url, '_blank')}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.02)';
                    e.currentTarget.style.transform = 'translateX(4px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '';
                    e.currentTarget.style.transform = 'translateX(0)';
                  }}
                >
                  {getFileIcon(file.mimeType, file.name)}
                  <div
                    style={{
                      flex: 1,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                  >
                    {file.name}
                  </div>
                  <Flex gap='6px' align='center' style={{ flexShrink: 0 }}>
                    <IconDownload
                      size={18}
                      style={{ opacity: 0.6, cursor: 'pointer' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        // Descarga directa via link
                        const a = document.createElement('a');
                        a.href = file.url;
                        a.download = file.name;
                        a.target = '_blank';
                        a.click();
                      }}
                    />
                    {canDeleteFiles && (
                      loading.deletingFile === file.url ? (
                        <Loader size={16} />
                      ) : (
                        <IconTrash
                          size={18}
                          color='red'
                          style={{ opacity: 0.6, cursor: 'pointer' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteFile(file.url, file.name);
                          }}
                        />
                      )
                    )}
                  </Flex>
                </Flex>
              ))
            )}
          </Flex>
        </>
      )}
    </>
  );
}

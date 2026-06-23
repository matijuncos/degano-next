'use client';
import '@mantine/dropzone/styles.css';
import { Box, Button, Flex, Loader } from '@mantine/core';
import { Group, Text, rem } from '@mantine/core';
import {
  IconUpload,
  IconPhoto,
  IconTrash,
  IconFile3d,
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

interface FileItem {
  id: string;
  name: string;
  webViewLink: string;
  mimeType: string;
  createdTime: string;
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
  const { folderName } = useDeganoCtx();
  const notify = useNotification();
  const [allFiles, setAllfiles] = useState<File[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [showUploadSection, setShowUploadSection] = useState(false);
  const [loading, setLoading] = useState<LoadingState>({
    fetchingFiles: false,
    uploading: false,
    deletingFile: null
  });

  // Función para obtener el ícono según el tipo de archivo
  const getFileIcon = (mimeType: string, fileName: string) => {
    const size = 20;

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
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension || '')) {
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

  // Cargar archivos al montar o cambiar folderName
  useEffect(() => {
    if (folderName) {
      fetchFiles();
    }
  }, [folderName]);

  const fetchFiles = async () => {
    setLoading((prev) => ({ ...prev, fetchingFiles: true }));
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
      notify({ type: 'defaultError', message: 'Error al cargar archivos' });
    } finally {
      setLoading((prev) => ({ ...prev, fetchingFiles: false }));
    }
  };

  const handleUploadClick = async () => {
    if (allFiles.length === 0) return;

    setLoading((prev) => ({ ...prev, uploading: true }));
    notify({ loading: true });

    try {
      // Subir archivos secuencialmente para evitar race conditions con la carpeta de Google Drive
      for (const file of allFiles) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('folderName', folderName);

        const response = await fetch('/api/uploadToGoogleDrive', {
          method: 'POST',
          body: formData
        });

        if (!response.ok) {
          throw new Error(`Error subiendo ${file.name}`);
        }
      }

      // Limpiar archivos pendientes
      setAllfiles([]);
      notify({ message: 'Archivos subidos correctamente' });

      // Recargar lista en background (no bloquea ni muestra error si tarda)
      setTimeout(() => fetchFiles(), 1500);
    } catch (error) {
      console.error('Error uploading files:', error);
      notify({ type: 'defaultError', message: 'Error al subir archivos' });
    } finally {
      setLoading((prev) => ({ ...prev, uploading: false }));
    }
  };

  const handleDeleteFile = async (fileId: string, fileName: string) => {
    if (!confirm(`¿Eliminar "${fileName}"?`)) return;

    setLoading((prev) => ({ ...prev, deletingFile: fileId }));
    try {
      const response = await fetch(`/api/deleteGoogleDriveFile?fileId=${fileId}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Error al eliminar');

      setFiles((prev) => prev.filter((f) => f.id !== fileId));
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
                  onDrop={(files) => setAllfiles((prev) => [...prev, ...files])}
                  onReject={(files) => {
                    console.log('rejected files', files);
                    alert(`Archivos rechazados: ${files.map(f => f.file.name).join(', ')}. Verifica que no excedan 10MB.`);
                  }}
                  maxSize={10 * 1024 ** 2}
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
                            archivo no debe exceder los 10MB
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
                        {allFiles.map((file) => {
                          return (
                            <div
                              key={file.name}
                              onClick={() => console.log(file)}
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
                          );
                        })}
                      </div>
                    )}
                  </Group>
                </Dropzone>
                {!!allFiles.length && (
                  <Flex direction='column' p='18px' gap='8px' flex={1}>
                    {allFiles.map((file) => {
                      return (
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
                            <>{file.name}</>
                          </div>
                          {canDeleteFiles && (
                            <IconTrash
                              color='red'
                              onClick={() =>
                                setAllfiles((prev) =>
                                  prev.filter((f) => f.name !== file.name)
                                )
                              }
                            />
                          )}
                        </Flex>
                      );
                    })}
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
            <h2>Archivos en la carpeta de este evento (Google drive)</h2>
            {loading.fetchingFiles ? (
              <Loader size='sm' />
            ) : (
              files?.map((file) => (
                <Flex
                  gap='12px'
                  key={file.id}
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
                  onClick={() => {
                    if (file.webViewLink) {
                      window.open(file.webViewLink, '_blank');
                    }
                  }}
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
                        if (file.id) {
                          window.open(
                            `https://drive.google.com/uc?export=download&id=${file.id}`,
                            '_blank'
                          );
                        }
                      }}
                    />
                    {canDeleteFiles && (
                      loading.deletingFile === file.id ? (
                        <Loader size={16} />
                      ) : (
                        <IconTrash
                          size={18}
                          color='red'
                          style={{ opacity: 0.6, cursor: 'pointer' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteFile(file.id, file.name);
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

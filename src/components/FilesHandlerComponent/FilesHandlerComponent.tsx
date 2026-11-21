'use client';
import '@mantine/dropzone/styles.css';
import { Box, Button, Flex, Loader, TextInput, Tooltip } from '@mantine/core';
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
  IconDownload,
  IconEye,
  IconPencil
} from '@tabler/icons-react';
import { Dropzone } from '@mantine/dropzone';
import { useEffect, useRef, useState } from 'react';
import { nanoid } from 'nanoid';
import { useDeganoCtx } from '@/context/DeganoContext';
import { listUpdateBody, fileInFolder, renameFile, FileListField } from '@/utils/eventScope';
import { openS3File } from '@/utils/s3Utils';
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

// `event`: el evento al que pertenecen los archivos. En Nuevo evento SIEMPRE se
// pasa el evento del formulario: el "evento seleccionado" global es el último
// que se abrió en la app y subir/borrar terminaba actuando sobre OTRO evento.
// Sin `event` (página del evento) se usa el seleccionado, que es ese mismo.
// Evento todavía NO creado (sin _id, Nuevo evento): los archivos se suben a SU
// carpeta (folderId único del formulario) y quedan en el formulario; se
// guardan junto con el evento al finalizar.
// `field`: qué lista de archivos maneja ('files' = Archivos del evento,
// 'musicFiles' = archivos de Música). `subfolder`: subcarpeta dentro de la del
// evento en S3 (ej. 'musica'). Se guarda SOLO esa lista (cuerpo parcial).
export default function FilesHandlerComponent({
  event,
  onEventUpdated,
  field = 'files',
  subfolder,
  title = 'Archivos del evento'
}: {
  event?: any;
  onEventUpdated?: (event: any) => void;
  field?: FileListField;
  subfolder?: string;
  title?: string;
} = {}) {
  const { can } = usePermissions();
  const canUploadFiles = can('canUploadFiles');
  const canDeleteFiles = can('canDeleteFiles');
  const ctx = useDeganoCtx();
  const selectedEvent = event !== undefined ? event : ctx.selectedEvent;
  const setSelectedEvent = onEventUpdated ?? ctx.setSelectedEvent;
  const notify = useNotification();
  const [allFiles, setAllfiles] = useState<File[]>([]);
  const [showUploadSection, setShowUploadSection] = useState(false);
  const [loading, setLoading] = useState<LoadingState>({
    fetchingFiles: false,
    uploading: false,
    deletingFile: null
  });

  // Archivos de esta lista (guardados en MongoDB)
  const files: EventFile[] = selectedEvent?.[field] || [];
  // Renombrar: archivo en edición y nombre escrito
  const [editingUrl, setEditingUrl] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  // Enter / Escape ya resolvieron: el blur que dispara el campo al cerrarse no
  // tiene que volver a guardar (ni guardar al cancelar con Escape)
  const renameDoneRef = useRef(false);
  const [renaming, setRenaming] = useState(false);

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
    if (allFiles.length === 0 || !selectedEvent) return;
    const persisted = !!selectedEvent._id;
    // Sin crear todavía: solo a la carpeta propia del formulario (nunca otra)
    if (!persisted && !selectedEvent.folderId) return;

    setLoading((prev) => ({ ...prev, uploading: true }));
    notify({ loading: true });

    try {
      const uploadedFiles: EventFile[] = [];

      // folderId único para los archivos de este evento. Si el evento ya
      // tiene uno se reutiliza; si no (eventos viejos), se genera y luego
      // se persiste con el evento para que quede estable.
      const folderId = selectedEvent.folderId || `evt-${nanoid()}`;

      for (const file of allFiles) {
        // 1. Obtener presigned URL de S3
        const presignRes = await fetch('/api/uploadToS3', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: file.name,
            fileType: file.type,
            bucket: 'events',
            folder: subfolder ? `${folderId}/${subfolder}` : folderId
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

      const updatedFiles = [...files, ...uploadedFiles];

      // Evento sin crear: quedan en el formulario (se guardan al finalizar)
      if (!persisted) {
        setSelectedEvent({ ...selectedEvent, [field]: updatedFiles, folderId });
        setAllfiles([]);
        notify({ message: 'Archivos subidos. Se guardan con el evento al finalizar.' });
        return;
      }

      // 3. Guardar referencias en el evento (MongoDB).
      // Se persiste también el folderId para que quede estable entre subidas.
      const saveRes = await fetch('/api/updateEvent', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        // Solo lo que cambia (updateEvent acepta cuerpos parciales): mandar el
        // evento entero pisaba el resto con una copia vieja de memoria
        body: JSON.stringify(listUpdateBody(selectedEvent._id, field, updatedFiles, folderId))
      });

      if (!saveRes.ok) throw new Error('Error guardando archivos en el evento');

      const data = await saveRes.json();
      setSelectedEvent(data.event || { ...selectedEvent, [field]: updatedFiles, folderId });

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
    if (!selectedEvent) return;
    const persisted = !!selectedEvent._id;
    // Sin crear todavía: solo se puede borrar un archivo de SU carpeta
    if (!persisted && !fileInFolder(fileUrl, selectedEvent.folderId)) return;

    setLoading((prev) => ({ ...prev, deletingFile: fileUrl }));
    try {
      if (!persisted) {
        const updatedFiles = files.filter((f) => f.url !== fileUrl);
        setSelectedEvent({ ...selectedEvent, [field]: updatedFiles });
        await fetch('/api/deleteFromS3', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: fileUrl, bucket: 'events' })
        });
        notify({ message: 'Archivo eliminado' });
        return;
      }

      // 1. Sacarlo del evento (solo esta lista). Si esto falla, el archivo NO se
      // borra de S3 (antes se borraba primero y podía perderse)
      const updatedFiles = files.filter((f) => f.url !== fileUrl);
      const saveRes = await fetch('/api/updateEvent', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(listUpdateBody(selectedEvent._id, field, updatedFiles))
      });
      const data = await saveRes.json().catch(() => ({}));
      if (!saveRes.ok) throw new Error(data?.error || 'No se pudo quitar el archivo del evento');
      setSelectedEvent(data.event || { ...selectedEvent, [field]: updatedFiles });

      // 2. Recién ahora, borrarlo de S3
      await fetch('/api/deleteFromS3', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: fileUrl, bucket: 'events' })
      });

      notify({ message: 'Archivo eliminado' });
    } catch (error) {
      console.error('Error deleting file:', error);
      notify({ type: 'defaultError', message: 'Error al eliminar archivo' });
    } finally {
      setLoading((prev) => ({ ...prev, deletingFile: null }));
    }
  };

  // Renombrar: solo cambia el nombre visible (el archivo en S3 no se toca)
  const saveRename = async (fileUrl: string) => {
    const updated = renameFile(files, fileUrl, editName);
    setEditingUrl(null);
    if (updated === files || !selectedEvent) return;
    if (!selectedEvent._id) {
      setSelectedEvent({ ...selectedEvent, [field]: updated });
      return;
    }
    // El aviso de la app actualiza el de "Cargando…": hay que abrirlo antes
    notify({ loading: true });
    setRenaming(true);
    try {
      const res = await fetch('/api/updateEvent', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(listUpdateBody(selectedEvent._id, field, updated))
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'No se pudo renombrar');
      setSelectedEvent(data.event || { ...selectedEvent, [field]: updated });
      notify({ message: 'Nombre actualizado' });
    } catch (error: any) {
      notify({ type: 'defaultError', message: error?.message });
    } finally {
      setRenaming(false);
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
            <h2>{title}</h2>
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
                  onClick={() => editingUrl !== file.url && openS3File(file.url)}
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
                    {editingUrl === file.url ? (
                      <TextInput
                        size='xs'
                        value={editName}
                        autoFocus
                        aria-label='Nuevo nombre del archivo'
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => setEditName(e.currentTarget.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            renameDoneRef.current = true;
                            saveRename(file.url);
                          }
                          if (e.key === 'Escape') {
                            renameDoneRef.current = true; // cancelar: no guarda
                            setEditingUrl(null);
                          }
                        }}
                        onBlur={() => {
                          if (renameDoneRef.current) return;
                          saveRename(file.url);
                        }}
                      />
                    ) : (
                      file.name
                    )}
                  </div>
                  <Flex gap='6px' align='center' style={{ flexShrink: 0 }}>
                    <Tooltip label='Ver'>
                      <IconEye
                        size={18}
                        style={{ opacity: 0.6, cursor: 'pointer' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          openS3File(file.url);
                        }}
                      />
                    </Tooltip>
                    {canUploadFiles && (
                      <Tooltip label='Renombrar'>
                        <IconPencil
                          size={18}
                          style={{ opacity: renaming ? 0.2 : 0.6, cursor: renaming ? 'not-allowed' : 'pointer' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            // Mientras se guarda un nombre, no se edita otro (pisaría el primero)
                            if (renaming) return;
                            renameDoneRef.current = false;
                            setEditName(file.name);
                            setEditingUrl(file.url);
                          }}
                        />
                      </Tooltip>
                    )}
                    <IconDownload
                      size={18}
                      style={{ opacity: 0.6, cursor: 'pointer' }}
                      onClick={async (e) => {
                        e.stopPropagation();
                        try {
                          const res = await fetch('/api/downloadFromS3', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              url: file.url,
                              fileName: file.name,
                              bucket: 'events'
                            })
                          });
                          const { signedUrl } = await res.json();
                          const a = document.createElement('a');
                          a.href = signedUrl;
                          a.download = file.name;
                          a.click();
                        } catch {
                          window.open(file.url, '_blank');
                        }
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

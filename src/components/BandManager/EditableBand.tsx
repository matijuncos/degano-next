import useSWR from 'swr';
import { useState, useEffect } from 'react';
import { Select, Card, Image, Box, Text } from '@mantine/core';
import { Input, Button, FileButton } from '@mantine/core';
import { Band, ExtraContact } from '@/context/types';
import { TimePicker } from '@mantine/dates';
import {
  IconEdit,
  IconTrash,
  IconSquareRoundedPlus,
  IconEye,
  IconFile,
  IconFileTypePdf
} from '@tabler/icons-react';
import EditableContact from './EditableContact';
import useLoadingCursor from '@/hooks/useLoadingCursor';
import useNotification from '@/hooks/useNotification';
import { getCleanFileName, getFileViewerUrl } from '@/utils/fileUtils';

const EditableBand = ({
  band,
  allBands,
  onSave,
  onCancel
}: {
  band?: Band;
  allBands: Band[];
  onSave: (band: Band) => void;
  onCancel: () => void;
}) => {
  const setLoadingCursor = useLoadingCursor();
  const notify = useNotification();
  const fetcher = (url: string) => fetch(url).then((res) => res.json());
  const { data: allContacts, mutate: refetchContacts } = useSWR<ExtraContact[]>(
    '/api/contacts',
    fetcher
  );

  useEffect(() => {
    if (band) {
      // Combinar fileUrl singular (legacy) con fileUrls array
      const allFiles = [
        ...((band as any).fileUrl ? [(band as any).fileUrl] : []),
        ...(band.fileUrls || [])
      ];
      // Remover duplicados
      const uniqueFiles = [...new Set(allFiles)];

      // Asegurar que fileUrls esté inicializado con todos los archivos
      const updatedBand = {
        ...band,
        fileUrls: uniqueFiles
      };
      setBandData(updatedBand);

      // Construir el mapa de nombres de archivos
      const fileNamesMap = new Map<string, string>();
      if (uniqueFiles.length > 0) {
        uniqueFiles.forEach(url => {
          const urlParts = url.split('/');
          const fileNameWithParams = urlParts[urlParts.length - 1];
          const fileName = fileNameWithParams.split('?')[0];
          const decodedFileName = decodeURIComponent(fileName);
          fileNamesMap.set(url, decodedFileName);
        });
      }
      setOriginalFileNames(fileNamesMap);
    } else {
      setBandData({
        _id: '',
        bandName: '',
        showTime: '',
        testTime: '',
        bandInfo: '',
        contacts: [],
        fileUrls: [],
        type: 'band'
      });
      setOriginalFileNames(new Map());
    }
  }, [band]);

  const [bandData, setBandData] = useState<Band>(
    band || {
      _id: '',
      bandName: '',
      showTime: '',
      testTime: '',
      bandInfo: '',
      contacts: [],
      fileUrls: [],
      type: 'band'
    }
  );
  const [showEditableContact, setShowEditableContact] = useState(false);
  const [selectedContact, setSelectedContact] = useState<ExtraContact | null>(
    null
  );
  const [waitingAws, setWaitingAws] = useState(false);
  const [originalFileNames, setOriginalFileNames] = useState<Map<string, string>>(new Map());

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBandData({ ...bandData, [e.target.name]: e.target.value });
  };

  const cancelEdit = () => {
    setBandData({
      _id: '',
      bandName: '',
      showTime: '',
      testTime: '',
      bandInfo: '',
      contacts: [],
      fileUrls: [],
      type: 'band'
    });
    setOriginalFileNames(new Map());
    onCancel();
  };

  const handleSave = async () => {
    try {
      setLoadingCursor(true);
      notify({ loading: true });
      const savedContacts: ExtraContact[] = [];
      for (const contact of bandData.contacts) {
        const method = contact._id ? 'PUT' : 'POST';
        const res = await fetch('/api/contacts', {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(contact)
        });
        if (!res.ok) throw new Error('Error saving contact');
        const savedContact = await res.json();
        savedContacts.push(savedContact);
      }

      const bandPayload = {
        ...bandData,
        contacts: savedContacts
      };

      const method = bandData._id ? 'PUT' : 'POST';
      const res = await fetch('/api/bands', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bandPayload)
      });
      if (!res.ok) throw new Error('Error saving band');

      const savedBand = await res.json();
      // Guardamos la banda con los horarios del evento, pero con el _id de la DB
      onSave({
        ...bandPayload,
        _id: savedBand._id
      });
      setBandData({
        _id: '',
        bandName: '',
        showTime: '',
        testTime: '',
        bandInfo: '',
        contacts: [],
        fileUrls: [],
        type: 'band'
      });
      setOriginalFileNames(new Map());
      notify({
        message: bandData._id ? 'Banda actualizada exitosamente' : 'Banda creada exitosamente'
      });
    } catch (error) {
      console.error('handleSave error', error);
      notify({ type: 'defaultError' });
    } finally {
      setLoadingCursor(false);
    }
  };

  const handleSaveContact = (contact: ExtraContact) => {
    setBandData((prev) => ({
      ...prev,
      contacts: selectedContact
        ? prev.contacts.map((c) =>
            c.name === selectedContact.name ? contact : c
          )
        : [...prev.contacts, contact]
    }));
    setShowEditableContact(false);
    setSelectedContact(null);
  };

  const handleEditContact = (contact: ExtraContact) => {
    setSelectedContact(contact);
    setShowEditableContact(true);
  };

  const handleDeleteContact = (index: number) => {
    setBandData((prev) => ({
      ...prev,
      contacts: prev.contacts.filter((_, i) => i !== index)
    }));
  };

  const handleUpload = async (file: File | null) => {
    if (!file) return;
    setWaitingAws(true);
    try {
      const res = await fetch('/api/uploadToS3', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type,
          bucket: 'bands'
        })
      });
      const { signedUrl, url } = await res.json();

      await fetch(signedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file
      });

      // Agregar al array de archivos
      setBandData((prev) => ({
        ...prev,
        fileUrls: [...(prev.fileUrls || []), url]
      }));

      // Agregar el nombre del archivo al mapa
      setOriginalFileNames((prev) => {
        const newMap = new Map(prev);
        newMap.set(url, file.name);
        return newMap;
      });
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setWaitingAws(false);
    }
  };

  const handleDeleteFile = async (fileUrl: string) => {
    if (!fileUrl) return;
    setWaitingAws(true);
    notify({ loading: true });
    try {
      // Eliminar de S3
      await fetch('/api/deleteFromS3', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: fileUrl, bucket: 'bands' })
      });

      // Actualizar el array de archivos
      const updatedFileUrls = (bandData.fileUrls || []).filter((url: string) => url !== fileUrl);

      // Actualizar el estado local
      setBandData((prev) => ({
        ...prev,
        fileUrls: updatedFileUrls
      }));

      // Eliminar del mapa de nombres
      setOriginalFileNames((prev) => {
        const newMap = new Map(prev);
        newMap.delete(fileUrl);
        return newMap;
      });

      // IMPORTANTE: Actualizar en la base de datos si la banda ya existe
      if (bandData._id) {
        const res = await fetch('/api/bands', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...bandData,
            fileUrls: updatedFileUrls
          })
        });
        if (!res.ok) throw new Error('Error updating band in database');
      }

      notify({ message: 'Archivo eliminado correctamente' });
    } catch (error) {
      console.error('Delete error:', error);
      notify({ type: 'defaultError' });
    } finally {
      setWaitingAws(false);
    }
  };

  const getFilePreview = (fileUrl: string) => {
    if (!fileUrl) return null;

    const isImage = /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(fileUrl);
    const isPdf = /\.pdf$/i.test(fileUrl);
    const cleanName = getCleanFileName(fileUrl);

    return (
      <Box
        key={fileUrl}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px',
          position: 'relative',
          maxWidth: '120px'
        }}
      >
        <Card
          withBorder
          padding="xs"
          style={{
            width: '100px',
            height: '100px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'transform 0.2s, box-shadow 0.2s',
          }}
          onClick={() => window.open(getFileViewerUrl(fileUrl), '_blank')}
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
              alt="Band file"
              fit="cover"
              style={{ width: '100%', height: '100%', borderRadius: '4px' }}
            />
          ) : isPdf ? (
            <IconFileTypePdf size={48} color="#FF0000" />
          ) : (
            <IconFile size={48} color="#888888" />
          )}
        </Card>
        <Text
          size="xs"
          style={{
            textAlign: 'center',
            wordBreak: 'break-word',
            maxWidth: '100%'
          }}
        >
          {cleanName}
        </Text>
        <Button
          color='red'
          variant='light'
          loading={waitingAws}
          onClick={() => handleDeleteFile(fileUrl)}
          size='xs'
          style={{ marginTop: '4px' }}
        >
          <IconTrash size={14} />
        </Button>
      </Box>
    );
  };

  return (
    <>
      <div className='band-inputs'>
        <div className='inputs-cointainer' style={{ alignItems: 'flex-end' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
              flex: 1
            }}
          >
            <Select
              label='Seleccionar banda existente'
              placeholder='Buscar...'
              searchable
              clearable
              data={
                allBands
                  ?.filter((b) => b._id !== bandData._id)
                  .sort((a, b) => a.bandName.localeCompare(b.bandName))
                  .map((b) => ({
                    value: b._id,
                    label: b.bandName
                  })) || []
              }
              value={bandData._id || ''}
              onChange={(val) => {
                const selected = allBands?.find((c) => c._id === val);
                if (selected) {
                  // Combinar fileUrl singular (legacy) con fileUrls array
                  const allFiles = [
                    ...((selected as any).fileUrl ? [(selected as any).fileUrl] : []),
                    ...(selected.fileUrls || [])
                  ];
                  // Remover duplicados
                  const uniqueFiles = [...new Set(allFiles)];

                  setBandData((prev) => ({
                    ...prev,
                    _id: selected._id,
                    bandName: selected.bandName,
                    showTime: selected.showTime,
                    testTime: selected.testTime,
                    bandInfo: selected.bandInfo,
                    contacts: selected.contacts,
                    fileUrls: uniqueFiles
                  }));
                }
              }}
            />
            <Input
              type='text'
              name='bandName'
              onChange={handleChange}
              placeholder='Banda'
              value={bandData.bandName}
              autoComplete='off'
              style={{ width: '60%' }}
            />
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-around',
              flex: 1,
              whiteSpace: 'nowrap'
            }}
          >
            <TimePicker
              name='showTime'
              label='Hora de presentación'
              value={bandData.showTime}
              onChange={(value) =>
                setBandData({ ...bandData, showTime: value })
              }
              style={{ width: '30%' }}
            />
            <TimePicker
              name='testTime'
              label='Hora prueba de sonido'
              value={bandData.testTime}
              onChange={(value) =>
                setBandData({ ...bandData, testTime: value })
              }
              style={{ width: '30%' }}
            />
          </div>
        </div>
        <div className='inputs-cointainer'>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-around',
              flex: 1
            }}
          >
            <Input
              type='text'
              name='bandInfo'
              onChange={handleChange}
              placeholder='Otros datos'
              value={bandData.bandInfo}
              autoComplete='off'
              style={{ width: '100%' }}
            />
          </div>
        </div>
      </div>

      {/* Sección de archivos antes de los botones */}
      <div style={{
        marginTop: '16px',
        marginBottom: '16px'
      }}>
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '16px',
          justifyContent: 'center',
          marginBottom: '16px'
        }}>
          {bandData.fileUrls && bandData.fileUrls.length > 0 &&
            bandData.fileUrls.map((fileUrl) =>
              getFilePreview(fileUrl)
            )
          }
        </div>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <FileButton
            onChange={handleUpload}
            accept='image/*,.pdf,.doc,.docx'
          >
            {(props) => (
              <Button {...props} loading={waitingAws} variant='outline'>
                {bandData.fileUrls && bandData.fileUrls.length > 0 ? 'Agregar otro archivo' : 'Subir archivo'}
              </Button>
            )}
          </FileButton>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '16px',
        }}
      >
        <Button style={{ width: '20%' }} onClick={cancelEdit} color='red'>
          Cancelar
        </Button>
        <Button style={{ width: '20%' }} onClick={handleSave} color='green'>
          Guardar
        </Button>
      </div>
      <div style={{ marginTop: '16px' }}>
        {!showEditableContact && (
          <div
            style={{ display: 'flex', cursor: 'pointer' }}
            onClick={() => setShowEditableContact(true)}
          >
            <p style={{ marginRight: '8px' }}>Agregar Contacto</p>
            <IconSquareRoundedPlus size={26} color='green' cursor='pointer' />
          </div>
        )}
        {showEditableContact && (
          <EditableContact
            contact={selectedContact || undefined}
            onSave={handleSaveContact}
            onCancel={() => {
              setShowEditableContact(false);
              setSelectedContact(null);
            }}
            allContacts={allContacts || []}
          />
        )}
      </div>
      {bandData.contacts.length > 0 && (
        <div style={{ marginTop: '16px' }}>
          <h4>Contactos:</h4>
          <ul>
            {bandData.contacts.map((c, index) => (
              <li
                key={index}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '8px'
                }}
              >
                <span>
                  <strong>{c.name}</strong> - {c.phone} - {c.rol}
                </span>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <IconEdit
                    cursor='pointer'
                    size={20}
                    color='#1971c2'
                    onClick={() => handleEditContact(c)}
                  />
                  <IconTrash
                    cursor='pointer'
                    size={20}
                    color='red'
                    onClick={() => handleDeleteContact(index)}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
};

export default EditableBand;

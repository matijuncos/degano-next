import { useState } from 'react';
import { Accordion, Button, Card, Image, Box, Text } from '@mantine/core';
import {
  IconEdit,
  IconTrash,
  IconSquareRoundedPlus,
  IconFile,
  IconFileTypePdf
} from '@tabler/icons-react';
import { Band } from '@/context/types';
import EditableBand from '../BandManager/EditableBand';
import useSWR from 'swr';

const BandList = ({
  bands,
  onBandsChange,
  editing
}: {
  bands: Band[];
  onBandsChange: (bands: Band[]) => void;
  editing?: boolean;
}) => {
  const [opened, setOpened] = useState<string | null>('Shows en vivo');
  const [selectedBand, setSelectedBand] = useState<Band | null>(null);
  const [showEditableBand, setShowEditableBand] = useState<boolean>(false);
  const fetcher = (url: string) => fetch(url).then((res) => res.json());
  const { data: allBands, mutate: refetchBands } = useSWR<Band[]>(
    '/api/bands',
    fetcher
  );

  const handleEditBand = (band: Band) => {
    setSelectedBand(band);
    setOpened('Shows en vivo');
    if (editing) setShowEditableBand(true);
  };

  const handleSaveBand = async (band: Band) => {
    onBandsChange(
      selectedBand
        ? bands.map((b) => (b.bandName === selectedBand.bandName ? band : b))
        : [...bands, band]
    );
    await refetchBands();
    setOpened(null);
  };

  const handleCancelBand = () => {
    setSelectedBand(null);
    setOpened(null);
    if (editing) setShowEditableBand(false);
  };

  const handleDeleteBand = (indexToRemove: number) => {
    onBandsChange(bands.filter((_, index) => index !== indexToRemove));
  };

  const getFilePreview = (fileUrl: string) => {
    if (!fileUrl) return null;

    // Extraer el nombre del archivo de la URL
    const urlParts = fileUrl.split('/');
    const fileNameWithParams = urlParts[urlParts.length - 1];
    const fileName = fileNameWithParams.split('?')[0]; // Remover parámetros de query
    const decodedFileName = decodeURIComponent(fileName);

    const isImage = /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(fileUrl);
    const isPdf = /\.pdf$/i.test(fileUrl);

    return (
      <Box
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '4px',
          cursor: 'pointer',
        }}
        onClick={() => window.open(fileUrl, '_blank')}
      >
        <Card
          withBorder
          padding="xs"
          style={{
            width: '80px',
            height: '80px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'transform 0.2s, box-shadow 0.2s',
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
              alt="Band file"
              fit="cover"
              style={{ width: '100%', height: '100%', borderRadius: '4px' }}
            />
          ) : isPdf ? (
            <IconFileTypePdf size={40} color="#FF0000" />
          ) : (
            <IconFile size={40} color="#888888" />
          )}
        </Card>
        <Text
          size="xs"
          ta="center"
          style={{
            maxWidth: '80px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
          title={decodedFileName}
        >
          {decodedFileName}
        </Text>
      </Box>
    );
  };

  return (
    <div style={{ marginTop: '10px' }}>
      {!editing && (
        <Accordion
          value={opened}
          onChange={setOpened} /*style={{ margin: '5px 0 10px' }}*/
        >
          <Accordion.Item key='Shows en vivo' value='Shows en vivo'>
            <Accordion.Control mb='12px'>
              <h3>{`Show${bands.length > 0 ? 's' : ''} en vivo`}</h3>
            </Accordion.Control>
            <Accordion.Panel>
              <EditableBand
                band={selectedBand || undefined}
                allBands={allBands || []}
                onSave={handleSaveBand}
                onCancel={handleCancelBand}
              />
            </Accordion.Panel>
          </Accordion.Item>
        </Accordion>
      )}
      {editing && (
        <>
          {!showEditableBand && (
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <IconSquareRoundedPlus
                onClick={() => setShowEditableBand(true)}
                color='green'
                cursor='pointer'
                size={30}
              />
            </div>
          )}
          {showEditableBand && (
            <EditableBand
              band={selectedBand || undefined}
              allBands={allBands || []}
              onSave={handleSaveBand}
              onCancel={handleCancelBand}
            />
          )}
        </>
      )}
      {bands.length > 0 && (
        <div>
          <h4 style={{ marginBottom: '12px' }}>Shows agregados:</h4>
          <ul style={{ padding: '0px 20px 20px' }}>
            {bands.map((b, index) => (
              <li
                key={index}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '12px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                  {b.fileUrl && getFilePreview(b.fileUrl)}
                  <span>
                    <strong>{b.bandName}</strong>{' '}
                    {b.contacts.length > 0 &&
                      `${
                        b.contacts[0].name
                          ? `- Contacto: ${b.contacts[0].name}`
                          : ''
                      } ${
                        b.contacts[0].rol ? `- Rol: ${b.contacts[0].rol}` : ''
                      }`}
                    {b.bandInfo ? `- ${b.bandInfo}` : ''}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <IconEdit
                    cursor='pointer'
                    size={22}
                    color='#1971c2'
                    onClick={() => handleEditBand(b)}
                  />
                  <IconTrash
                    cursor='pointer'
                    size={22}
                    color='red'
                    onClick={() => handleDeleteBand(index)}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default BandList;

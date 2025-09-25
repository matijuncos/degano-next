import { useState } from 'react';
import { Accordion, Button } from '@mantine/core';
import {
  IconEdit,
  IconTrash,
  IconSquareRoundedPlus
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
  const [opened, setOpened] = useState<string | null>(null);
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
                  marginBottom: '8px'
                }}
              >
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

      {/* <Button onClick={() => setOpened('Banda en vivo')}>Agregar Banda</Button> */}
    </div>
  );
};

export default BandList;

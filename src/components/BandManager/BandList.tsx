import { useState } from 'react';
import { Accordion, Button } from '@mantine/core';
import {
  IconEdit,
  IconTrash,
  IconSquareRoundedPlus
} from '@tabler/icons-react';
import { Band } from '@/context/types';
import EditableBand from '../BandManager/EditableBand';
import useLoadingCursor from '@/hooks/useLoadingCursor';
import useNotification from '@/hooks/useNotification';
import { useParams } from 'next/navigation';

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
  const setLoadingCursor = useLoadingCursor();
  const notify = useNotification();
  const params = useParams();

  const handleEditBand = (band: Band) => {
    setSelectedBand(band);
    setOpened('Banda en vivo');
    if (editing) setShowEditableBand(true);
  };

  const handleSaveBand = async (band: Band) => {
    onBandsChange(
      selectedBand
        ? bands.map((b) => (b.bandName === selectedBand.bandName ? band : b))
        : [...bands, band]
    );
  };

  const handleCancelBand = () => {
    setSelectedBand(null);
    setOpened(null);
    if (editing) setShowEditableBand(false);
  };

  const handleDeleteBand = (indexToRemove: number) => {
    onBandsChange(bands.filter((_, index) => index !== indexToRemove));
  };
  console.log('bands ', bands);
  return (
    <>
      {!editing && (
        <Accordion
          value={opened}
          onChange={setOpened} /*style={{ margin: '5px 0 10px' }}*/
        >
          <Accordion.Item key='Banda en vivo' value='Banda en vivo'>
            <Accordion.Control style={{ padding: 0 }}>
              <h3>{`Banda${bands.length > 0 ? 's' : ''} en vivo`}</h3>
            </Accordion.Control>
            <Accordion.Panel>
              <EditableBand
                band={selectedBand || undefined}
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
              onSave={handleSaveBand}
              onCancel={handleCancelBand}
            />
          )}
        </>
      )}
      {bands.length > 0 && (
        <div>
          <h4>Bandas agregadas:</h4>
          <ul style={{ padding: '0px 20px 20px' }}>
            {bands.map((b, index) => (
              <li
                key={index}
                style={{ display: 'flex', justifyContent: 'space-between' }}
              >
                <span>
                  <strong>{b.bandName}</strong> - {b.manager} ({b.managerPhone}){' '}
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
    </>
  );
};

export default BandList;

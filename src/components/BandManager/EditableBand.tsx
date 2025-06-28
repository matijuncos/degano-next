import { useState, useEffect } from 'react';
import { Input, Button } from '@mantine/core';
import { Band } from '@/context/types';

const EditableBand = ({
  band,
  onSave,
  onCancel
}: {
  band?: Band;
  onSave: (band: Band) => void;
  onCancel: () => void;
}) => {
  useEffect(() => {
    if (band) {
      setBandData(band);
    } else {
      setBandData({ bandName: '', manager: '', managerPhone: '', bandInfo: '' });
    }
  }, [band]);

  const [bandData, setBandData] = useState<Band>(
    band || { bandName: '', manager: '', managerPhone: '', bandInfo: '' }
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBandData({ ...bandData, [e.target.name]: e.target.value });
  };

  const handleSave = () => {
    onSave(bandData);
    setBandData({ bandName: '', manager: '', managerPhone: '', bandInfo: '' });
  };

  return (
    <>
    <div className='inputs-grid'>
      <Input
        type="text"
        name="bandName"
        onChange={handleChange}
        placeholder="Banda"
        value={bandData.bandName}
        autoComplete="off"
      />
      <Input
        type="text"
        name="manager"
        onChange={handleChange}
        placeholder="Manager"
        value={bandData.manager}
        autoComplete="off"
      />
      <Input
        type="text"
        name="managerPhone"
        onChange={handleChange}
        placeholder="Teléfono del manager"
        value={bandData.managerPhone}
        autoComplete="off"
      />
      <Input
        type="text"
        name="bandInfo"
        onChange={handleChange}
        placeholder="Otros datos"
        value={bandData.bandInfo}
        autoComplete="off"
      />
    </div>
      <div style={{display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '16px'}}>
        <Button style={{width: '20%'}} onClick={onCancel} color="red">Cancelar</Button>
        <Button style={{width: '20%'}} onClick={handleSave} color="green">Guardar</Button>
      </div>
    </>
  );
};

export default EditableBand;

import React from 'react';
import { NewEquipment } from '../equipmentStockTable/types';

type inputProps = {
  newEquipment: NewEquipment;
  handleChange: (field: keyof NewEquipment, value: string | number) => void;
  placeholderMapping: { [key in keyof NewEquipment]: string };
};

const NewEquipmentTable = ({
  handleChange,
  newEquipment,
  placeholderMapping
}: inputProps) => {
  return (
    <div
      style={{
        overflowX: 'auto',
        width: '100%'
      }}
    >
      <div
        style={{
          display: 'flex',
          width: `${Object.entries(newEquipment).length * 15}%`
        }}
      >
        {Object.entries(newEquipment).map(([key, value]) => {
          const placeholder = placeholderMapping[key as keyof NewEquipment];
          return (
            <div
              key={key}
              style={{
                flex: '0 0 15%',
                padding: '8px',
                boxSizing: 'border-box'
              }}
            >
              {key === 'type' ? (
                <select
                  value={value === 'No Definido' ? '' : value}
                  onChange={(e) =>
                    handleChange(key as keyof NewEquipment, e.target.value)
                  }
                  style={{
                    width: '100%',
                    padding: '8px',
                    height: '45px',
                    boxSizing: 'border-box'
                  }}
                >
                  <option value='' disabled>
                    {placeholder}
                  </option>
                  {[
                    'Sonido',
                    'Iluminación',
                    'Imagen',
                    'Accesorios',
                    'No Definido'
                  ].map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type='text'
                  placeholder={placeholder}
                  value={value === 0 || value === '' ? '' : value}
                  onChange={(e) =>
                    handleChange(key as keyof NewEquipment, e.target.value)
                  }
                  style={{
                    width: '100%',
                    padding: '8px',
                    height: '45px',
                    boxSizing: 'border-box'
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default NewEquipmentTable;

import React from 'react';
import { TableTd, Input } from '@mantine/core';
import { Equipment } from '@/context/types';

interface CustomCellProps {
  field: keyof Equipment;
  value: string | number;
  isEditing: boolean;
  handleChange: (field: keyof Equipment, value: string | number) => void;
}

const CustomCell: React.FC<CustomCellProps> = ({
  field,
  value,
  isEditing,
  handleChange
}) => {
  return (
    <TableTd>
      {isEditing ? (
        <Input
          value={value}
          onChange={(e) => handleChange(field, e.target.value)}
        />
      ) : (
        value
      )}
    </TableTd>
  );
};

export default CustomCell;

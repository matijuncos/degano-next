import React from 'react';
import { TableTd, Input, Text } from '@mantine/core';
import { NewEquipment } from '../equipmentStockTable/types';

interface CustomCellProps {
  field: any;
  value: string | number;
  isEditing: boolean;
  handleChange: (field: keyof NewEquipment, value: string | number) => void;
  color?: string;
}

const CustomCell: React.FC<CustomCellProps> = ({
  field,
  value,
  isEditing,
  handleChange,
  color,
  ...props
}) => {
  return (
    <TableTd c={color}>
      {isEditing ? (
        <Input
          value={value}
          onChange={(e) => handleChange(field, e.target.value)}
        />
      ) : (
        <Text>{value}</Text>
      )}
    </TableTd>
  );
};

export default CustomCell;

import { Equipment } from '@/context/types';
import { Input, TableTd } from '@mantine/core';
import React from 'react';

const EquipmentCustomCell = ({
  field,
  value,
  isEditing,
  handleChange
}: {
  field: keyof Equipment;
  value: string | number;
  isEditing: boolean;
  handleChange: (field: keyof Equipment, e: any) => void;
}) =>
  isEditing ? (
    <TableTd>
      <Input
        value={value}
        onChange={(e) => handleChange(field, e.target.value)}
      />
    </TableTd>
  ) : (
    <TableTd>{value}</TableTd>
  );

export default EquipmentCustomCell;

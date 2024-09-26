import { useDeganoCtx } from '@/context/DeganoContext';
import {
  Table,
  TableTbody,
  TableTd,
  TableTh,
  TableThead,
  TableTr
} from '@mantine/core';
import React, { useEffect, useState } from 'react';
import CustomRow from '../EquipmentCustomRow/EquipmentCustomRow';
import { IconPlus } from '@tabler/icons-react';
import RowWithInputs from '../RowWithInputs/RowWithInputs';
import { useUser } from '@auth0/nextjs-auth0/client';

const EquipmentTable = () => {
  const { selectedEvent } = useDeganoCtx();
  const [equipmentListToEdit, setEquipmentListToEdit] = useState(
    selectedEvent?.equipment || []
  );
  const { user } = useUser();
  const [showInputRow, setShowInputRow] = useState(false);
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    if (selectedEvent) {
      setEquipmentListToEdit(selectedEvent.equipment);
    }
  }, [selectedEvent]);

  const handleAddNewRow = () => {
    setShowInputRow(true);
  };

  const calculateTotal = () => {
    return isAdmin
      ? equipmentListToEdit.reduce(
          (acc, item) => acc + item.price * (item.selectedQuantity || 1),
          0
        )
      : '****';
  };

  return (
    <Table>
      <TableThead>
        <TableTh>Equipo</TableTh>
        <TableTh>Cantidad</TableTh>
        <TableTh>Precio ($)</TableTh>
        <TableTh>Subtotal</TableTh>
        <TableTh>Acciones</TableTh>
        <TableTh w='16px'>
          <IconPlus onClick={handleAddNewRow} />
        </TableTh>
      </TableThead>
      <TableTbody>
        {showInputRow && (
          <RowWithInputs hideRow={() => setShowInputRow(false)} />
        )}
        {equipmentListToEdit.map((eq, i) => (
          <CustomRow
            setEquipmentListToEdit={setEquipmentListToEdit}
            equipmentListToEdit={equipmentListToEdit}
            index={i}
            key={i}
            eq={eq}
          />
        ))}
        <TableTr>
          <TableTd align='right' colSpan={6}>
            Total: ${calculateTotal()}
          </TableTd>
        </TableTr>
      </TableTbody>
    </Table>
  );
};

export default EquipmentTable;

import {
  Box,
  Checkbox,
  Input,
  Table,
  TableTbody,
  TableTd,
  TableThead,
  TableTr,
  Text
} from '@mantine/core';
import { NewEquipment } from '../equipmentStockTable/types';
import { EventModel } from '@/context/types';

const ChoseComponentFromDBComponent = ({
  equipment,
  setEquipment,
  equipmentFromDB
}: {
  equipment: EventModel;
  setEquipment: Function;
  equipmentFromDB: NewEquipment[];
}) => {
  const handleCheckEquipment = (value: NewEquipment) => {
    if (
      equipment.equipment.some(
        (item) => item._id.toString() === value._id.toString()
      )
    ) {
      setEquipment({
        ...equipment,
        equipment: equipment.equipment.filter(
          (item) => item._id.toString() !== value._id.toString()
        )
      });
    } else {
      setEquipment({
        ...equipment,
        equipment: [...equipment.equipment, value]
      });
    }
  };

  const handleQuantityChange = (id: string, quantity: number) => {
    setEquipment((prev: EventModel) => {
      return {
        ...prev,
        equipment: prev.equipment.map((item) =>
          item._id.toString() === id
            ? { ...item, selectedQuantity: quantity }
            : item
        )
      };
    });
  };

  return (
    <>
      <Box>
        <Table>
          <TableThead>
            <TableTr>
              <TableTd></TableTd>
              <TableTd>Nombre</TableTd>
              {equipment.equipment.length > 0 && <TableTd>Cantidad</TableTd>}
              <TableTd>Cantidad disponible</TableTd>
            </TableTr>
          </TableThead>
          <TableTbody>
            {(equipmentFromDB as NewEquipment[])?.map((eq) => {
              const selectedItem = equipment.equipment.find(
                (item) => item._id.toString() === eq._id.toString()
              );

              return (
                <TableTr key={eq._id}>
                  <TableTd>
                    <Checkbox
                      checked={Boolean(selectedItem)}
                      onChange={() => handleCheckEquipment(eq)}
                    />
                  </TableTd>
                  <TableTd>{eq.name}</TableTd>
                  {equipment.equipment.length > 0 && (
                    <TableTd>
                      {Boolean(selectedItem) && (
                        <Input
                          type='number'
                          placeholder='cuantos llevas?'
                          value={selectedItem?.selectedQuantity}
                          onChange={(e) =>
                            handleQuantityChange(
                              eq._id.toString(),
                              Number(e.target.value)
                            )
                          }
                          min={1}
                        />
                      )}
                    </TableTd>
                  )}
                  <TableTd>
                    <Text
                      c={
                        Number(eq.currentQuantity) -
                          Number(selectedItem?.selectedQuantity || 0) >=
                        0
                          ? 'green'
                          : 'red'
                      }
                    >
                      {Number(eq.currentQuantity) -
                        Number(selectedItem?.selectedQuantity || 0)}
                    </Text>
                  </TableTd>
                  <TableTd></TableTd>
                </TableTr>
              );
            })}
          </TableTbody>
        </Table>
      </Box>
    </>
  );
};

export default ChoseComponentFromDBComponent;

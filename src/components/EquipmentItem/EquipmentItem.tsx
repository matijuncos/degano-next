import { inputType } from '@/app/equipment-stock/page';
import { Flex, Text, Button, Input } from '@mantine/core';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import { useState } from 'react';

type EquipmentItem = {
  value: string;
  type: inputType;
  children?: EquipmentItem[];
  price?: string;
  _id: any;
};

type EquipmentItemProps = {
  item: EquipmentItem;
  onAddChild: (parentIdPath: any[], value: string, price: string) => void;
  onDelete: (itemIdPath: any[]) => void;
  parentIdPath?: any[];
  level?: number;
};
const EquipmentItem: React.FC<EquipmentItemProps> = ({
  item,
  onAddChild,
  onDelete,
  parentIdPath = []
}) => {
  const currentPath = [...parentIdPath, item._id];
  const [showInputs, setShowInputs] = useState(false);
  const [childName, setChildName] = useState('');
  const [childPrice, setChildPrice] = useState('');
  return (
    <Flex direction='column' gap='8px'>
      <Flex align='center' justify='space-between'>
        <Text>
          {item.value} - {item.price}
        </Text>
        <Flex gap='8px'>
          <Button size='xs' onClick={() => setShowInputs(!showInputs)}>
            <IconPlus size={16} />
          </Button>

          <Button size='xs' color='red' onClick={() => onDelete(currentPath)}>
            <IconTrash size={16} />
          </Button>
        </Flex>
      </Flex>
      {showInputs && (
        <>
          <Input
            placeholder='Especifica el nombre'
            onChange={(e) => setChildName(e.target.value)}
            value={childName}
          />
          <Input
            placeholder='Especifica el precio'
            onChange={(e) => setChildPrice(e.target.value)}
            value={childPrice}
          />
          <Button
            onClick={() => {
              setShowInputs(false);
              onAddChild(currentPath, childName, childPrice);
            }}
          >
            Confirmar
          </Button>{' '}
        </>
      )}
      {item.children && (
        <Flex direction='column' pl='20px'>
          {item.children.map((child: EquipmentItem) => (
            <EquipmentItem
              key={child._id}
              item={child}
              onAddChild={onAddChild}
              onDelete={onDelete}
              parentIdPath={currentPath}
            />
          ))}
        </Flex>
      )}
    </Flex>
  );
};

export default EquipmentItem;

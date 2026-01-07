import { inputType } from '@/app/equipment-stock/types';
import { Flex, Text, Button, Input, Modal, Box, Badge } from '@mantine/core';
import {
  IconAlertTriangle,
  IconCheckupList,
  IconMusicCode,
  IconPlus,
  IconTrash
} from '@tabler/icons-react';
import { useState } from 'react';
import { capitalizeWords } from './utils';
import { useDisclosure } from '@mantine/hooks';
import { usePermissions } from '@/hooks/usePermissions';

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
  idx?: number;
};
const EquipmentItem: React.FC<EquipmentItemProps> = ({
  item,
  onAddChild,
  onDelete,
  parentIdPath = []
}) => {
  const { can } = usePermissions();
  const canViewPrices = can('canViewEquipmentPrices');
  const currentPath = [...parentIdPath, item._id];
  const [showInputs, setShowInputs] = useState(false);
  const [childName, setChildName] = useState('');
  const [childPrice, setChildPrice] = useState('');
  const [opened, { open, close }] = useDisclosure(false);

  const iconsbyIndex: { [key: string]: JSX.Element } = {
    [inputType.parent]: <IconMusicCode size={14} color='green' />,
    [inputType.child]: <IconCheckupList size={14} color='white' />
  };

  return (
    <>
      <Modal
        opened={opened}
        onClose={close}
        title='¿Seguro que desea eliminar este item?'
      >
        <Flex direction='column' align='center' gap='16px'>
          <IconAlertTriangle size={80} />
          <Button
            w='100%'
            variant='gradient'
            onClick={() => onDelete(currentPath)}
          >
            Confirmar
          </Button>
        </Flex>
      </Modal>
      <Flex direction='column' gap='8px'>
        <Flex align='center' justify='space-between'>
          <Flex align='center' gap='8px'>
            {iconsbyIndex[item.type]}
            <Flex gap='12px'>
              <Text style={{ fontWeight: '600' }}>
                {capitalizeWords(item.value)}{' '}
              </Text>
              {canViewPrices && item.price && (
                <>
                  <Text>-</Text>
                  <Badge size='lg' color='indigo'>
                    {' '}
                    {item.price ? `$${item.price}` : 0}
                  </Badge>
                </>
              )}
            </Flex>
          </Flex>
          <Flex gap='8px'>
            <Button size='xs' onClick={() => setShowInputs(!showInputs)}>
              <IconPlus size={16} />
            </Button>

            <Button size='xs' color='red' onClick={() => open()}>
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
          <Flex direction='column' pl='30px'>
            {item.children.map((child: EquipmentItem, idx) => {
              return (
                <EquipmentItem
                  key={child._id}
                  item={child}
                  onAddChild={onAddChild}
                  onDelete={onDelete}
                  parentIdPath={currentPath}
                  idx={idx}
                />
              );
            })}
          </Flex>
        )}
      </Flex>
    </>
  );
};

export default EquipmentItem;

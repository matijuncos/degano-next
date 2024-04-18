'use client';
import EquipmentItem from '@/components/EquipmentItem/EquipmentItem';
import { withPageAuthRequired } from '@auth0/nextjs-auth0/client';
import { Box, Button, Flex, Input, Text } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import axios from 'axios';
import _, { cloneDeep } from 'lodash';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { v4 } from 'uuid';
import { InputTreeParent, inputType } from './types';

const EquipmentSelects = withPageAuthRequired(() => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [equipmentInputNameValue, setEquipmentInputNameValue] = useState('');
  const [equipmentInputPriceValue, setEquipmentInputPriceValue] = useState('');
  const [inputList, setInputList] = useState<InputTreeParent[]>([]);

  const searchForEquipmentInventory = useCallback(async () => {
    const params = new URLSearchParams(searchParams.toString());
    const { data } = await axios.get('/api/getEquipment');
    params.set('id', data.equipment.at(-1)._id);
    const url = `${pathname}?${params.toString()}`;
    router.replace(url);
    setInputList(data.equipment.at(-1).equipment);
  }, [router, searchParams, pathname]);

  useEffect(() => {
    searchForEquipmentInventory();
  }, [searchForEquipmentInventory]);

  const addInputHandler = () => {
    let clonedState = cloneDeep(inputList);
    const newState = [
      ...clonedState,
      {
        value: equipmentInputNameValue,
        type: inputType.parent,
        children: [],
        price: equipmentInputPriceValue,
        _id: v4()
      }
    ];
    setInputList(newState);
    saveEquipmentInventory(newState);
  };

  const saveEquipmentInventory = useCallback(
    async (state: any) => {
      if (!state.length) return;
      await axios.put('/api/updateEquipmentList', {
        equipment: state,
        _id: new URLSearchParams(searchParams.toString()).get('id')
      });
      searchForEquipmentInventory();
    },
    [searchParams, searchForEquipmentInventory]
  );

  const addNestedChild = (
    path: any[],
    { value, price }: { value: string; price: string }
  ) => {
    const clonedState = _.cloneDeep(inputList);
    let target = clonedState;

    for (const id of path) {
      const nextTarget = target.find((item) => item._id === id);
      if (!nextTarget) throw new Error('Path not found');
      if (!nextTarget.children) nextTarget.children = [];
      target = nextTarget.children;
    }

    target.push({
      value,
      type: inputType.child,
      children: [],
      price,
      _id: v4()
    });

    setInputList(clonedState);
    saveEquipmentInventory(clonedState);
  };

  const deleteNestedItem = (path: any[]) => {
    const clonedState = _.cloneDeep(inputList);
    let target = clonedState;
    // Navigate to the parent of the target item
    const itemId = path.pop();
    for (const id of path) {
      const nextTarget = target.find((item) => item._id === id);
      if (!nextTarget || !nextTarget.children)
        throw new Error('Path not found');
      target = nextTarget.children;
    }
    // Remove the target item
    const index = target.findIndex((item) => item._id === itemId);
    if (index > -1) {
      target.splice(index, 1);
    }
    setInputList(clonedState);
    saveEquipmentInventory(clonedState);
  };
  const handleAddChild = (
    parentIdPath: any[],
    value: string,
    price: string
  ) => {
    addNestedChild(parentIdPath, { value, price });
  };

  const handleDeleteItem = (itemIdPath: any[]) => {
    deleteNestedItem(itemIdPath);
  };

  return (
    <Box maw='1140px' m='auto'>
      <Box mb='12px'>
        <Text size='28px'>Equipos disponibles</Text>
        <Text>(Anidamiento jerárquico)</Text>
      </Box>
      <Flex direction='column' gap='42px' maw='1140px' m='auto'>
        <Flex direction='column' gap='24px'>
          <Flex direction='column' flex='1' gap='6px'>
            <Input
              placeholder='Nombre de equipo'
              onChange={(e) => setEquipmentInputNameValue(e.target.value)}
            />
            <Input
              placeholder='Costo de equipo'
              onChange={(e) => setEquipmentInputPriceValue(e.target.value)}
            />
            <Button onClick={addInputHandler}>
              Agregar equipo
              <IconPlus />
            </Button>
          </Flex>
          <hr />
          <Flex
            direction='column'
            flex='1'
            gap='6px'
            mah='400px'
            style={{
              overflow: 'auto'
            }}
          >
            {inputList.map((itm) => (
              <EquipmentItem
                key={itm._id}
                item={itm}
                onAddChild={handleAddChild}
                onDelete={handleDeleteItem}
              />
            ))}
          </Flex>
        </Flex>
      </Flex>
    </Box>
  );
});
export default EquipmentSelects;

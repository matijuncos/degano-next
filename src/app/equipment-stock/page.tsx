'use client';
import EquipmentItem from '@/components/EquipmentItem/EquipmentItem';
import { Button, Flex, Input } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import axios from 'axios';
import _ from 'lodash';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { v4 } from 'uuid';

export enum inputType {
  parent = 'parent',
  child = 'child'
}

export type InputTreeParent = {
  value: string;
  type: inputType;
  children?: InputTreeParent[];
  price?: string;
  _id: any;
  parentValue?: string;
};

const EquipmentSelects = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [equipmentInputNameValue, setEquipmentInputNameValue] = useState('');
  const [equipmentInputPriceValue, setEquipmentInputPriceValue] = useState('');
  const [inputList, setInputList] = useState<InputTreeParent[]>([]);

  const searchForEquipmentInventory = useCallback(async () => {
    const params = new URLSearchParams(searchParams.toString());
    const { data } = await axios.get('/api/getEquipment');
    params.set('id', data.equipment[0]._id);
    const url = `${pathname}?${params.toString()}`;
    router.replace(url);
    setInputList(data.equipment[0].equipment);
  }, [router, searchParams, pathname]);

  useEffect(() => {
    searchForEquipmentInventory();
  }, [searchForEquipmentInventory]);

  const addInputHandler = () => {
    setInputList([
      ...inputList,
      {
        value: equipmentInputNameValue,
        type: inputType.parent,
        children: [],
        price: equipmentInputPriceValue,
        _id: v4()
      }
    ]);
  };

  const saveEquipmentInventory = async () => {
    await axios.put('/api/updateEquipmentList', {
      equipment: inputList,
      _id: new URLSearchParams(searchParams.toString()).get('id')
    });
    searchForEquipmentInventory();
  };

  const addNestedChild = (
    path: any[],
    { value, price }: { value: string; price: string }
  ) => {
    const clonedState = _.cloneDeep(inputList);
    let target = clonedState;

    // Navigate to the target parent using the path
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
    <Flex direction='column' gap='42px'>
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
        <Flex direction='column' flex='1' gap='6px'>
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
      <Button onClick={saveEquipmentInventory}>
        Guardar cambios de inventario
      </Button>
      <hr />
    </Flex>
  );
};
export default EquipmentSelects;

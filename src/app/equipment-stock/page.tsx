'use client';
import EquipmentItem from '@/components/EquipmentItem/EquipmentItem';
import { withPageAuthRequired } from '@auth0/nextjs-auth0/client';
import { Box, Button, Flex, Input, Modal, Text } from '@mantine/core';
import { IconAlertTriangle, IconPlus, IconTrash } from '@tabler/icons-react';
import _, { cloneDeep } from 'lodash';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { v4 } from 'uuid';
import { InputTreeParent, inputType } from './types';
import { useDisclosure } from '@mantine/hooks';
import useNotification from '@/hooks/useNotification';

const EquipmentSelects = withPageAuthRequired(() => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const notify = useNotification();
  const [opened, { open, close }] = useDisclosure(false);

  const [equipmentInputNameValue, setEquipmentInputNameValue] = useState('');
  const [equipmentInputPriceValue, setEquipmentInputPriceValue] = useState('');
  const [inputList, setInputList] = useState<InputTreeParent[]>([]);

  const searchForEquipmentInventory = useCallback(async () => {
    const params = new URLSearchParams(searchParams.toString());
    const timestamp = new Date();

    const response = await fetch('/api/getEquipment', { cache: 'no-store' });
    const data = await response.json();
    const equipment = data.equipment.at(-1);
    params.set('id', equipment._id);
    params.set('stamp', timestamp.toString());
    const url = `${pathname}?${params.toString()}`;
    router.replace(url);
    setInputList(equipment.equipment);
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
    async (state: any, removeEverything?: boolean) => {
      if (!state.length) return;

      const payload = {
        equipment: state,
        _id: new URLSearchParams(searchParams.toString()).get('id')
      };

      if (removeEverything) {
        Object.assign(payload, { cleanStock: true });
      }
      
      notify({loading: true});
      try {
        await fetch('/api/updateEquipmentList', {
          method: 'PUT',
          body: JSON.stringify(payload),
          cache: 'no-store',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        notify({message: 'Se ga guardado el equipo correctamente'});
        searchForEquipmentInventory();
      } catch (err) {
        notify({type: 'defaultError'});
        console.error('Error guardando el equipo', err);
        throw err;
      }
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
    const itemId = path.pop();
    for (const id of path) {
      const nextTarget = target.find((item) => item._id === id);
      if (!nextTarget || !nextTarget.children)
        throw new Error('Path not found');
      target = nextTarget.children;
    }
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

  const onDeleteEverything = () => {
    saveEquipmentInventory(inputList, true);
    close();
  };

  return (
    <>
      <Modal
        opened={opened}
        onClose={close}
        title='¿Seguro que desea eliminar todos los items?'
      >
        <Flex direction='column' align='center' gap='16px'>
          <IconAlertTriangle size={80} />
          <Button
            w='100%'
            variant='gradient'
            onClick={() => onDeleteEverything()}
          >
            Confirmar
          </Button>
        </Flex>
      </Modal>
      <Box maw='1140px' m='auto'>
        <Flex justify='space-between'>
          <Box mb='12px'>
            <Text size='28px'>Equipos disponibles</Text>
            <Text>(Anidamiento jerárquico)</Text>
          </Box>
          <Button color='red' onClick={() => open()}>
            Borrar Todos los items <IconTrash />
          </Button>
        </Flex>
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
              mah='calc(100vh - 300px)'
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
    </>
  );
});
export default EquipmentSelects;

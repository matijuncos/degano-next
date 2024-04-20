'use client';
import { FC, useCallback, useEffect, useState } from 'react';
import RecursiveCheckbox from '../RecursiveCheckbox/RecursiveCheckBox';
import { Box, Button, Flex, List, ListItem, Text } from '@mantine/core';
import { InputTreeParent } from '@/app/equipment-stock/types';
import { useUser } from '@auth0/nextjs-auth0/client';

export type SelectedEquipmentItem = {
  name: string;
  quantity: string;
};

const EquipmentCheckBoxes: FC<any> = ({
  inputListProp
}: {
  inputListProp: InputTreeParent[] & { quantity: number };
}) => {
  const addQuantityRecursively = (
    items: InputTreeParent[]
  ): InputTreeParent[] => {
    return items.map((item) => ({
      ...item,
      quantity: '1',
      children: addQuantityRecursively(item.children || [])
    }));
  };

  const inputListPropWithInitialQuantity =
    addQuantityRecursively(inputListProp);

  const [selectedParentCheckBoxes, setSelectedParentCheckBoxes] = useState<
    SelectedEquipmentItem[]
  >([]);

  const [selectedChildrenCheckBoxes, setSelectedChildrenCheckBoxes] = useState<
    SelectedEquipmentItem[]
  >([]);

  const [totalPrice, setTotalPrice] = useState(0);
  const allSelectedItems = [
    ...selectedChildrenCheckBoxes,
    ...selectedParentCheckBoxes
  ];

  const { user } = useUser();
  const parseAndSaveData = useCallback(() => {
    const filterChildren = (children: InputTreeParent[]): InputTreeParent[] => {
      return children
        .filter((child) =>
          selectedChildrenCheckBoxes.some((item) => item.name === child.value)
        )
        .map((child) => {
          const selectedChild = selectedChildrenCheckBoxes.find(
            (item) => item.name === child.value
          );
          return {
            ...child,
            quantity: selectedChild ? selectedChild.quantity : '1', // Keep as string
            children: child.children ? filterChildren(child.children) : []
          };
        });
    };

    const filteredInputList = inputListPropWithInitialQuantity
      .filter((parent) =>
        selectedParentCheckBoxes.some((item) => item.name === parent.value)
      )
      .map((parent) => {
        const selectedParent = selectedParentCheckBoxes.find(
          (item) => item.name === parent.value
        );
        return {
          ...parent,
          quantity: selectedParent ? selectedParent.quantity : '1', // Keep as string
          children: parent.children ? filterChildren(parent.children) : []
        };
      });
    return filteredInputList;
  }, [
    inputListPropWithInitialQuantity,
    selectedChildrenCheckBoxes,
    selectedParentCheckBoxes
  ]);

  useEffect(() => {
    const calculateTotalPrice = (items: InputTreeParent[]): number => {
      return items.reduce((acc, item) => {
        const childrenPrice = item.children
          ? calculateTotalPrice(item.children)
          : 0;
        const itemPrice =
          typeof item.price === 'string' ? Number(item.price) : item.price;
        const quantity = Number(item.quantity) || 1; // Default quantity to 1 if not specified
        return acc + (itemPrice || 0) * quantity + childrenPrice;
      }, 0);
    };
    const totalPrice = calculateTotalPrice(parseAndSaveData());
    setTotalPrice(totalPrice);
  }, [selectedParentCheckBoxes, selectedChildrenCheckBoxes, parseAndSaveData]);

  const parentCheckBoxesHandler = (
    e: React.ChangeEvent<HTMLInputElement>,
    item: InputTreeParent
  ) => {
    const { value, checked } = e.target;

    setSelectedParentCheckBoxes((prev: SelectedEquipmentItem[]) => {
      return checked
        ? [...prev, { name: value, quantity: '1' }]
        : prev.filter((val) => val.name !== value);
    });

    const collectAllDescendantValues = (
      item: InputTreeParent
    ): SelectedEquipmentItem[] => {
      let values: SelectedEquipmentItem[] = [];
      if (item.children) {
        item.children.forEach((child: InputTreeParent) => {
          values.push(
            { name: child.value, quantity: child.quantity || '1' },
            ...collectAllDescendantValues(child)
          );
        });
      }
      return values;
    };

    if (item.children) {
      const descendantValues = collectAllDescendantValues(item);
      setSelectedChildrenCheckBoxes((prev: SelectedEquipmentItem[]) => {
        const newChildrenSet = checked
          ? Array.from(new Set([...prev, ...descendantValues]))
          : prev.filter(
              (val) =>
                !descendantValues.some((item) => val.name === item.quantity)
            );
        return newChildrenSet;
      });
    }
  };

  const childCheckBoxesHandler = (
    e: React.ChangeEvent<HTMLInputElement>,
    childItem: InputTreeParent
  ) => {
    const { value, checked } = e.target;

    setSelectedChildrenCheckBoxes((prev: SelectedEquipmentItem[]) => {
      let updated: SelectedEquipmentItem[] = checked
        ? [...prev, { name: value, quantity: '1' }]
        : prev.filter((val) => val.name !== value);
      if (childItem.children) {
        const grandchildrenValues = childItem.children.map(
          (grandchild: InputTreeParent) => {
            return {
              name: grandchild.value,
              quantity: grandchild.quantity
            } as SelectedEquipmentItem;
          }
        );
        if (checked) {
          updated = Array.from(new Set([...updated, ...grandchildrenValues]));
        } else {
          updated = updated.filter(
            (val) => !grandchildrenValues.some((item) => item.name === val.name)
          );
        }
      }
      return updated;
    });
  };

  const RecursiveItemList = ({ item }: { item: InputTreeParent }) => {
    return (
      <>
        <ListItem>
          {item.value}({item.quantity}) - ${item.price}
          <Text>- Subtotal: ${Number(item.quantity) * Number(item.price)}</Text>
        </ListItem>
        {item?.children?.filter(checkIfItemIsSelected).map((item) => (
          <Box key={item._id} pl='16px'>
            <ListItem>
              <Text>
                {item.value}({item.quantity}) - ${item.price}
              </Text>
              <Text>
                - Subtotal: ${Number(item.quantity) * Number(item.price)}
              </Text>
            </ListItem>
          </Box>
        ))}
      </>
    );
  };

  const checkIfItemIsSelected = (item: InputTreeParent) => {
    return allSelectedItems.some((el) => el.name === item.value);
  };
  const isAdmin = user?.role === 'admin';

  const updateItemQuantity = (itemId: string, newQuantity: number) => {
    setSelectedParentCheckBoxes((prev) =>
      prev.map((item) =>
        item.name === itemId
          ? { ...item, quantity: newQuantity.toString() }
          : item
      )
    );

    setSelectedChildrenCheckBoxes((prev) =>
      prev.map((item) =>
        item.name === itemId
          ? { ...item, quantity: newQuantity.toString() }
          : item
      )
    );
  };

  const updateQuantitiesInList = (
    list: InputTreeParent[]
  ): InputTreeParent[] => {
    const findQuantity = (itemName: string): string => {
      const parentItem = selectedParentCheckBoxes.find(
        (item) => item.name === itemName
      );
      if (parentItem) {
        return parentItem.quantity;
      }

      const childItem = selectedChildrenCheckBoxes.find(
        (item) => item.name === itemName
      );
      if (childItem) {
        return childItem.quantity;
      }

      return '1';
    };

    const updateItemQuantities = (
      items: InputTreeParent[]
    ): InputTreeParent[] => {
      return items.map((item) => {
        const updatedQuantity = findQuantity(item.value);
        const updatedChildren = item.children
          ? updateItemQuantities(item.children)
          : [];
        return {
          ...item,
          quantity: updatedQuantity,
          children: updatedChildren
        };
      });
    };

    return updateItemQuantities(list);
  };

  const updatedList = updateQuantitiesInList(inputListPropWithInitialQuantity);

  return (
    <>
      <Flex gap='18px'>
        <Box flex='1' mah='640px' style={{ overflow: 'auto' }}>
          {inputListPropWithInitialQuantity?.map((parentEq) => (
            <RecursiveCheckbox
              key={parentEq._id}
              item={parentEq}
              updateItemQuantity={updateItemQuantity}
              selectedParentCheckBoxes={selectedParentCheckBoxes}
              selectedChildrenCheckBoxes={selectedChildrenCheckBoxes}
              parentCheckBoxesHandler={parentCheckBoxesHandler}
              childCheckBoxesHandler={childCheckBoxesHandler}
            />
          ))}
        </Box>

        <Flex direction='column' w='420px' gap='12px'>
          {isAdmin && (
            <>
              <Text size='48px'>Total:</Text>
              <Text ml='8px' size='32px'>
                ${totalPrice}
              </Text>
            </>
          )}
          <br />

          <List>
            {updatedList.filter(checkIfItemIsSelected).map((list) => {
              return <RecursiveItemList key={list._id} item={list} />;
            })}
          </List>
        </Flex>
      </Flex>
      <Button mt='16px' onClick={parseAndSaveData}>
        Guardar
      </Button>
    </>
  );
};
export default EquipmentCheckBoxes;

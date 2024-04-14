'use client';
import { InputTreeParent } from '@/app/equipment-stock/page';
import { FC, useCallback, useEffect, useState } from 'react';
import RecursiveCheckbox from '../RecursiveCheckbox/RecursiveCheckBox';
import { Box, Button, Flex } from '@mantine/core';

const EquipmentCheckBoxes: FC<any> = ({
  inputListProp
}: {
  inputListProp: InputTreeParent[];
}) => {
  const [selectedParentCheckBoxes, setSelectedParentCheckBoxes] = useState<
    string[]
  >([]);

  const [selectedChildrenCheckBoxes, setSelectedChildrenCheckBoxes] = useState<
    string[]
  >([]);

  const [totalPrice, setTotalPrice] = useState(0);

  const parseAndSaveData = useCallback(() => {
    const filterChildren = (children: InputTreeParent[]): InputTreeParent[] => {
      return children
        .filter((child) => selectedChildrenCheckBoxes.includes(child.value))
        .map((child) => ({
          ...child,
          children: child.children ? filterChildren(child.children) : []
        }));
    };

    const filteredInputList = inputListProp
      .filter((parent) => selectedParentCheckBoxes.includes(parent.value))
      .map((parent) => ({
        ...parent,
        children: parent.children ? filterChildren(parent.children) : []
      }));

    console.log(filteredInputList); // This is the payload
    return filteredInputList;
  }, [inputListProp, selectedChildrenCheckBoxes, selectedParentCheckBoxes]);

  useEffect(() => {
    const calculateTotalPrice = (items: InputTreeParent[]): number => {
      return items.reduce((acc, item) => {
        const childrenPrice = item.children
          ? calculateTotalPrice(item.children)
          : 0;
        const itemPrice =
          typeof item.price === 'string' ? Number(item.price) : item.price;
        return acc + (itemPrice || 0) + childrenPrice;
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
    setSelectedParentCheckBoxes((prev) => {
      return checked ? [...prev, value] : prev.filter((val) => val !== value);
    });

    const collectAllDescendantValues = (item: InputTreeParent): string[] => {
      let values: string[] = [];
      if (item.children) {
        item.children.forEach((child) => {
          values.push(child.value, ...collectAllDescendantValues(child));
        });
      }
      return values;
    };

    if (item.children) {
      const descendantValues = collectAllDescendantValues(item);
      setSelectedChildrenCheckBoxes((prev) => {
        const newChildrenSet = checked
          ? Array.from(new Set([...prev, ...descendantValues])) // Add all descendants if checked
          : prev.filter((val) => !descendantValues.includes(val)); // Remove all descendants if unchecked
        return newChildrenSet;
      });
    }
  };

  const childCheckBoxesHandler = (
    e: React.ChangeEvent<HTMLInputElement>,
    childItem: InputTreeParent
  ) => {
    const { value, checked } = e.target;

    setSelectedChildrenCheckBoxes((prev) => {
      let updated = checked
        ? [...prev, value]
        : prev.filter((val) => val !== value);
      if (childItem.children) {
        const grandchildrenValues = childItem.children.map(
          (grandchild) => grandchild.value
        );
        if (checked) {
          updated = Array.from(new Set([...updated, ...grandchildrenValues]));
        } else {
          updated = updated.filter((val) => !grandchildrenValues.includes(val));
        }
      }
      return updated;
    });
  };

  return (
    <Flex gap='18px'>
      <Box flex='1'>
        {inputListProp?.map((parentEq) => (
          <RecursiveCheckbox
            key={parentEq._id}
            item={parentEq}
            selectedParentCheckBoxes={selectedParentCheckBoxes}
            selectedChildrenCheckBoxes={selectedChildrenCheckBoxes}
            parentCheckBoxesHandler={parentCheckBoxesHandler}
            childCheckBoxesHandler={childCheckBoxesHandler}
          />
        ))}
        <Button mt='16px' onClick={parseAndSaveData}>
          Guardar
        </Button>
      </Box>
      <Box w='220px'>Total: ${totalPrice}</Box>
    </Flex>
  );
};
export default EquipmentCheckBoxes;

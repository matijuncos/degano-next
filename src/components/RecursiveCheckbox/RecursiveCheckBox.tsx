import { InputTreeParent, inputType } from '@/app/equipment-stock/types';
import { useUser } from '@auth0/nextjs-auth0/client';
import { Checkbox, Box, Flex, Input } from '@mantine/core';
import { SelectedEquipmentItem } from '../EquipmentCheckboxes/EquipmentCheboxes';
type RecursiveCheckboxProps = {
  item: InputTreeParent;
  selectedParentCheckBoxes: SelectedEquipmentItem[];
  selectedChildrenCheckBoxes: SelectedEquipmentItem[];
  updateItemQuantity: (
    itemId: string,
    newQuantity: number,
    updateDescendants?: boolean
  ) => void;
  parentCheckBoxesHandler: (
    e: React.ChangeEvent<HTMLInputElement>,
    item: InputTreeParent
  ) => void;
  childCheckBoxesHandler: (
    e: React.ChangeEvent<HTMLInputElement>,
    childItem: InputTreeParent,
    parentValue: string
  ) => void;
};

const RecursiveCheckbox: React.FC<RecursiveCheckboxProps> = ({
  item,
  selectedParentCheckBoxes,
  selectedChildrenCheckBoxes,
  parentCheckBoxesHandler,
  childCheckBoxesHandler,
  updateItemQuantity
}) => {
  const isParentChecked =
    selectedParentCheckBoxes.some((val) => val.name === item.value) ||
    selectedChildrenCheckBoxes.some((val) => val.name === item.value);
  const { user } = useUser();
  const isAdmin = user?.role === 'admin';

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (item.type === 'parent') {
      parentCheckBoxesHandler(e, item);
    } else {
      childCheckBoxesHandler(e, item, item.parentValue || '');
    }
  };

  const changeQuantityInputChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const newQuantity = e.target.value; // Get the new quantity from the event
    updateItemQuantity(item.value, Number(newQuantity)); // Update the state with the new quantity
  };

  const findQuantityForItem = (itemName: string): string => {
    // First, try to find the item in the selectedParentCheckBoxes array
    const parentItem = selectedParentCheckBoxes.find(
      (item) => item.name === itemName
    );
    if (parentItem) {
      return parentItem.quantity;
    }

    // If not found, try to find the item in the selectedChildrenCheckBoxes array
    const childItem = selectedChildrenCheckBoxes.find(
      (item) => item.name === itemName
    );
    if (childItem) {
      return childItem.quantity;
    }

    // If the item is not found in either array, default to '1'
    return '1';
  };

  return (
    <Flex
      direction='column'
      gap='1em'
      w='100%'
      miw='fit-content'
      key={item._id}
      style={
        item.type === inputType.parent
          ? {
              borderBottom: 'solid 2px gray',
              backgroundColor: 'rgba(130,130,130,0.1)',
              padding: '16px 0 16px 16px'
            }
          : {
              paddingLeft: '32px'
            }
      }
    >
      <Flex gap='8px'>
        <Checkbox
          w='fit-content'
          miw='220px'
          id={item._id}
          value={item.value}
          checked={isParentChecked}
          label={
            <label htmlFor={item._id}>
              <Flex
                align='center'
                gap='18px'
                bg={isParentChecked ? 'green' : 'white'}
                p='8px'
                style={{
                  borderRadius: '6px',
                  fontWeight: '600',
                  color: isParentChecked ? 'white' : 'black',
                  cursor: 'pointer'
                }}
              >
                {`${item.value}${isAdmin ? ` - $${item.price || 0}` : ''}`}
                {isParentChecked && (
                  <>
                    <Flex align='center' gap='6px'>
                      <label> Cantidad:</label>
                      <input
                        type='number'
                        onChange={changeQuantityInputChange}
                        value={findQuantityForItem(item.value)}
                        style={{
                          backgroundColor: 'rgba(0,0,10,0.4)',
                          width: '80px',
                          borderRadius: '4px',
                          outline: 'none',
                          border: '1px solid rgba(0,0,10,0.4)',
                          paddingLeft: '5px',
                          color: isParentChecked ? 'white' : 'green'
                        }}
                      />
                    </Flex>
                  </>
                )}
              </Flex>
            </label>
          }
          onChange={handleCheckboxChange}
        />
      </Flex>
      {isParentChecked && item.children && (
        <>
          {item.children
            .map((child) => ({ ...child, parentValue: item.value }))
            .map((child) => (
              <Box key={child._id}>
                <RecursiveCheckbox
                  item={child}
                  updateItemQuantity={updateItemQuantity}
                  selectedParentCheckBoxes={selectedParentCheckBoxes}
                  selectedChildrenCheckBoxes={selectedChildrenCheckBoxes}
                  parentCheckBoxesHandler={parentCheckBoxesHandler}
                  childCheckBoxesHandler={childCheckBoxesHandler}
                />
              </Box>
            ))}
        </>
      )}
    </Flex>
  );
};

export default RecursiveCheckbox;

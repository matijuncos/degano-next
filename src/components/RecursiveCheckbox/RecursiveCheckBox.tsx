import { InputTreeParent, inputType } from '@/app/equipment-stock/types';
import { useUser } from '@auth0/nextjs-auth0/client';
import { Checkbox, Box, Flex } from '@mantine/core';
type RecursiveCheckboxProps = {
  item: InputTreeParent;
  selectedParentCheckBoxes: string[];
  selectedChildrenCheckBoxes: string[];
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
  childCheckBoxesHandler
}) => {
  const isParentChecked =
    selectedParentCheckBoxes.includes(item.value) ||
    selectedChildrenCheckBoxes.includes(item.value);
  const { user } = useUser();
  const isAdmin = user?.role === 'admin';

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (item.type === 'parent') {
      parentCheckBoxesHandler(e, item);
    } else {
      childCheckBoxesHandler(e, item, item.parentValue || '');
    }
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
              padding: '16px'
            }
          : {
              paddingLeft: '32px'
            }
      }
    >
      <Checkbox
        w='fit-content'
        miw='220px'
        id={item._id}
        value={item.value}
        checked={isParentChecked}
        label={
          <label htmlFor={item._id}>
            <Box
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
            </Box>
          </label>
        }
        onChange={handleCheckboxChange}
      />
      {isParentChecked && item.children && (
        <>
          {item.children
            .map((child) => ({ ...child, parentValue: item.value }))
            .map((child) => (
              <Box key={child._id}>
                <RecursiveCheckbox
                  item={child}
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

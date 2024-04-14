import { InputTreeParent, inputType } from '@/app/equipment-stock/page';
import { Checkbox, Grid, Box, Flex, Text } from '@mantine/core';
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

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (item.type === 'parent') {
      parentCheckBoxesHandler(e, item);
    } else {
      childCheckBoxesHandler(e, item, item.parentValue || '');
    }
  };

  return (
    <Box
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
          : {}
      }
    >
      <Checkbox
        w='fit-content'
        miw='220px'
        value={item.value}
        checked={isParentChecked}
        label={`${item.value} - $${item.price || 0}`}
        mb='1em'
        onChange={handleCheckboxChange}
      />
      {isParentChecked && item.children && (
        <Grid justify='flex-start' align='flex-start' columns={9} pl='2em'>
          {item.children
            .map((child) => ({ ...child, parentValue: item.value }))
            .map((child) => (
              <Grid.Col span={9} key={child._id}>
                <RecursiveCheckbox
                  item={child}
                  selectedParentCheckBoxes={selectedParentCheckBoxes}
                  selectedChildrenCheckBoxes={selectedChildrenCheckBoxes}
                  parentCheckBoxesHandler={parentCheckBoxesHandler}
                  childCheckBoxesHandler={childCheckBoxesHandler}
                />
              </Grid.Col>
            ))}
        </Grid>
      )}
    </Box>
  );
};

export default RecursiveCheckbox;

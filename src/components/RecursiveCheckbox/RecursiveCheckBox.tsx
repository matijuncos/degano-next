import { InputTreeParent } from '@/app/equipment-stock/page';
import { Checkbox, Grid, Box } from '@mantine/core';

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
    <Box key={item._id}>
      <Checkbox
        value={item.value}
        checked={isParentChecked}
        label={item.value}
        mb='1em'
        onChange={handleCheckboxChange}
      />
      {isParentChecked && item.children && (
        <Grid justify='flex-start' align='flex-start' columns={9} pl='2em'>
          {item.children
            .map((child) => ({ ...child, parentValue: item.value }))
            .map((child) => (
              <Grid.Col span={2} key={child._id}>
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

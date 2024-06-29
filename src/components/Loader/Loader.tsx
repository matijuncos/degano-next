import { Box, Loader as Spinner } from '@mantine/core';

const Loader = () => {
  return (
    <Box
      w='100%'
      style={{
        display: 'grid',
        minHeight: '50vw',
        margin: 'auto',
        placeItems: 'center'
      }}
    >
      <Spinner color='green' size='lg' />;
    </Box>
  );
};

export default Loader;

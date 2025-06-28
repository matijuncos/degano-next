import { useEffect } from 'react';

const useLoadingCursor = () => {
  const setLoadingCursor = (loading) => {
    if (loading) {
      console.log('loading')
    document.body.classList.add('loading');
    } else {
      console.log('no loading')
    document.body.classList.remove('loading');
    }
  }
  // Limpieza al desmontar el componente
  useEffect(() => {
    return () => {
      console.log('remove')
      document.body.classList.remove('loading');
    };
  }, []);
  return setLoadingCursor;
};

export default useLoadingCursor;

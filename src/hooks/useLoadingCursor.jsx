import { useEffect } from 'react';

const useLoadingCursor = (loading) => {
  const setLoadingCursor = (loading) => {
    if (loading) {
    document.body.classList.add('loading');
    } else {
    document.body.classList.remove('loading');
    }
  }
  // Limpieza al desmontar el componente
  useEffect(() => {
    return () => {
      document.body.classList.remove('loading');
    };
  }, []);
  return setLoadingCursor;
};

export default useLoadingCursor;

import { useEffect } from 'react';

const useLoadingCursor = (loading) => {
  useEffect(() => {
    if (loading) {
      document.body.classList.add('loading');
    } else {
      document.body.classList.remove('loading');
    }

    return () => {
      document.body.classList.remove('loading');
    };
  }, [loading]);
};

export default useLoadingCursor;

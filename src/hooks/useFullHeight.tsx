import { useEffect, useState } from 'react';

export default function useFullHeight() {
  const [height, setHeight] = useState('100vh');

  useEffect(() => {
    const updateHeight = () => {
      setHeight(`${window.innerHeight}px`);
    };

    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  return height;
}

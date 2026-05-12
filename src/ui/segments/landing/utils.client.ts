'use client';

import { useEffect, useState } from 'react';

import { ID_MENU } from './constants';

export function useMenuHeight(): number {
  const [menuHeight, setMenuHeight] = useState(0);
  useEffect(() => {
    const menu = document.getElementById(ID_MENU);
    if (!menu) return;

    setMenuHeight(menu.clientHeight);
    const observer = new ResizeObserver(() => {
      setMenuHeight(menu.clientHeight);
    });
    observer.observe(menu);
    return () => observer.disconnect();
  }, []);
  return menuHeight;
}

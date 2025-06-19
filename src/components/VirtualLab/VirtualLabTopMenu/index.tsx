'use client';

import { useEffect, useRef, ReactNode, useState, useLayoutEffect } from 'react';
import { useSetAtom } from 'jotai';

import { projectTopMenuRefAtom } from '@/state/virtual-lab/lab';
import { classNames } from '@/util/utils';

type Props = {
  className?: string;
  // @FIXME: Unused props?
  // eslint-disable-next-line react/no-unused-prop-types
  extraItems?: ReactNode[];
  // eslint-disable-next-line react/no-unused-prop-types
  ghost?: boolean;
};

export default function VirtualLabTopMenu({ className }: Props) {
  const localRef = useRef(null);
  const setProjectTopMenuRef = useSetAtom(projectTopMenuRefAtom);
  const menuRef = useRef<HTMLDivElement>(null);
  // @FIXME: This is not used?
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [menuElementsHeight, setMenuElementsHeight] = useState<number | null>(null);

  useLayoutEffect(() => {
    if (!menuRef || !menuRef.current) return;
    setMenuElementsHeight(menuRef.current.getBoundingClientRect().height);
  }, [setMenuElementsHeight]);

  useEffect(() => {
    setProjectTopMenuRef(localRef);
  }, [setProjectTopMenuRef]);

  return (
    <div
      className={classNames('flex h-14 w-full justify-between overflow-y-visible', className)}
      role="menu"
    >
      <div className="flex gap-4" ref={localRef} />
    </div>
  );
}

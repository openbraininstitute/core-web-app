'use client';

import { useEffect, useRef, ReactNode, useState, useLayoutEffect } from 'react';
import { UserOutlined } from '@ant-design/icons';
import { useSession } from 'next-auth/react';
import Link from 'next/link'; // eslint-disable-line
import { useSetAtom } from 'jotai';
import { projectTopMenuRefAtom } from '@/state/virtual-lab/lab';
import { classNames, signOut } from '@/util/utils';

type Props = {
  className?: string;
  extraItems?: ReactNode[];
  ghost?: boolean;
};

export default function VirtualLabTopMenu({ className, extraItems, ghost = true }: Props) {
  const { data: session } = useSession();
  const localRef = useRef(null);
  const setProjectTopMenuRef = useSetAtom(projectTopMenuRefAtom);
  const [expanded, setExpanded] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuElementsHeight, setMenuElementsHeight] = useState<number | null>(null);

  useLayoutEffect(() => {
    if (!menuRef || !menuRef.current) return;
    setMenuElementsHeight(menuRef.current.getBoundingClientRect().height);
  }, [setMenuElementsHeight]);

  useEffect(() => {
    setProjectTopMenuRef(localRef);
  }, [setProjectTopMenuRef]);

  const getMenuButtonClassName = (
    ghost: boolean // eslint-disable-line
  ) =>
    classNames(
      'w-52 p-4 font-bold flex items-center border border-primary-7',
      ghost ? 'bg-transparent' : 'bg-primary-8'
    );

  const menuButtonStyle = { height: menuElementsHeight ?? undefined }; // eslint-disable-line

  return (
    <div
      className={classNames('flex h-14 w-full justify-between overflow-y-visible', className)}
      role="menu"
    >
      <div className="flex gap-4" ref={localRef} />
    </div>
  );
}

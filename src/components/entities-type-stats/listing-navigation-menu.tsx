'use client';

import { WarningOutlined } from '@ant-design/icons';
import { CSSProperties, ReactNode } from 'react';
import { useParams } from 'next/navigation';
import { Menu, MenuProps } from 'antd';
import { useAtomValue } from 'jotai';
import get from 'es-toolkit/compat/get';

import { useBrainRegionHierarchy } from '@/features/brain-region-hierarchy/context';
import { entitiesCountAtom } from '@/services/entitycore/entities-count';
import { resolveDataKey } from '@/utils/key-builder';

import type { TEntityTypeDict } from '@/api/entitycore/types';
import type { WorkspaceContext } from '@/types/common';

export type NavigationMenuItem = {
  key: string;
  title: string;
  entitytype: Partial<TEntityTypeDict> | undefined;
  label: ReactNode;
  className: string;
  style: CSSProperties;
};

type Props = {
  activePath: string;
  items: Array<NavigationMenuItem>;
  onClick: MenuProps['onClick'];
};

export default function NavigationMenu({ activePath, items, onClick }: Props) {
  const { virtualLabId, projectId } = useParams<WorkspaceContext>();
  const dataKey = resolveDataKey({ section: 'explore', projectId });
  const { node } = useBrainRegionHierarchy({ dataKey });

  const { data, error } = useAtomValue(
    entitiesCountAtom({ virtualLabId, projectId, brainRegionId: node.id })
  );

  const updatedItems = items.map(({ entitytype, label, ...rest }) => {
    let value: ReactNode;
    if (error) value = <WarningOutlined className="text-xl" />;
    if (data) {
      const v = get(data, `${entitytype}`, null);
      if (typeof v === 'number') value = get(data, `${entitytype}`, null);
      else value = null;
    }
    return {
      ...rest,
      label: `${label} ${value !== null ? `(${value})` : ''}`,
    };
  });

  return (
    <Menu
      onClick={onClick}
      selectedKeys={[activePath]}
      mode="horizontal"
      theme="dark"
      style={{ backgroundColor: '#002766' }}
      className="flex w-[calc(100%+6px)] justify-start"
      items={updatedItems}
    />
  );
}

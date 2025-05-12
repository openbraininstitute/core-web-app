'use client';

import { LoadingOutlined, WarningOutlined } from '@ant-design/icons';
import { CSSProperties, ReactNode } from 'react';
import { useParams } from 'next/navigation';
import { Menu, MenuProps } from 'antd';
import { useAtomValue } from 'jotai';
import get from 'lodash/get';

import { useBrainRegionHierarchy } from '@/features/brain-region-tree/v2/brain-region/context';
import { EntitiesCountAtom } from '@/services/entitycore/entities-count';
import { DataType } from '@/constants/explore-section/list-views';
import { resolveDataKey } from '@/utils/key-builder';

import type { WorkspaceContext } from '@/types/common';

export type NavigationMenuItem = {
  key: string;
  title: string;
  entitytype: DataType | undefined;
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
  const { node } = useBrainRegionHierarchy({
    dataKey: resolveDataKey({ section: 'explore', projectId }),
  });
  const { data, error } = useAtomValue(
    EntitiesCountAtom({ virtualLabId, projectId, brainRegionId: node.id })
  );
  const allData = data ? { ...data.experimental, ...data.model } : {};

  const updatedItems = items.map(({ entitytype, label, ...rest }) => {
    let value: ReactNode;
    if (error) value = <WarningOutlined className="text-xl" />;
    if (allData) {
      const v = get(allData, `${entitytype}`, null);
      if (typeof v === 'number') value = get(allData, `${entitytype}`, null);
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

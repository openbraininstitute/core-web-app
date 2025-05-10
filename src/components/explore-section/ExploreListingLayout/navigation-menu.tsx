import { WarningOutlined } from '@ant-design/icons';
import { CSSProperties, ReactNode } from 'react';
import { useParams } from 'next/navigation';
import { Menu, MenuProps } from 'antd';
import { useAtomValue } from 'jotai';
import { useQueryState } from 'nuqs';
import get from 'lodash/get';

import { DEFAULT_BRAIN_REGION_QUERY_ID } from '@/features/brain-region-tree/latest/brain-region/context';
import { EntitiesCountAtom } from '@/services/entitycore/entities-count';
import { DataType } from '@/constants/explore-section/list-views';

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
  const [brainRegionId] = useQueryState(DEFAULT_BRAIN_REGION_QUERY_ID);
  const { data, error } = useAtomValue(
    EntitiesCountAtom({ virtualLabId, projectId, brainRegionId })
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

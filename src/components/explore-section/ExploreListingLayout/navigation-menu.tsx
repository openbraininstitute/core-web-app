import { CSSProperties, ReactNode, use } from 'react';
import { WarningOutlined } from '@ant-design/icons';
import { Menu, MenuProps } from 'antd';
import get from 'lodash/get';

import { DataType } from '@/constants/explore-section/list-views';

import type { BulkEntityCoreCountResult } from '@/services/entitycore/entities-types-count';
import type { Result } from '@/api/utils';

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
  entityCounterPromise: Promise<Result<BulkEntityCoreCountResult, Error>>;
  items: Array<NavigationMenuItem>;
  onClick: MenuProps['onClick'];
};

export default function NavigationMenu({
  activePath,
  items,
  onClick,
  entityCounterPromise,
}: Props) {
  const { data, error } = use(entityCounterPromise);
  const allData = data ? { ...data.experimental, ...data.model } : {};

  const updatedItems = items.map(({ entitytype, label, ...rest }) => {
    let value: ReactNode;
    if (error) value = <WarningOutlined className="text-xl" />;
    if (data) {
      const v = get(allData, `${entitytype}`, null);
      if (typeof v === 'number') value = get(allData, `${entitytype}`);
      else value = 'error';
    }
    return {
      ...rest,
      label: `${label} (${value})`,
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

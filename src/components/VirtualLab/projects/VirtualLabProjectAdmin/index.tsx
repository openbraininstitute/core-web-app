'use client';

import { useMemo } from 'react';
import { CollapseProps } from 'antd';
import { useQueryState } from 'nuqs';

import Collapse from '@/components/Collapse';
import CostsPanel from './CostPanel';

export default function VirtualLabProjectAdmin({
  virtualLabId,
  projectId,
}: {
  virtualLabId: string;
  projectId: string;
}) {
  const [activePanelKey, setActivePanel] = useQueryState('panel', {
    clearOnDefault: true,
    defaultValue: '',
  });

  const onChangePanel = (key: string | string[]) => setActivePanel(String(key));

  const costs = useMemo(
    () => ({
      key: 'costs',
      children: <CostsPanel virtualLabId={virtualLabId} projectId={projectId} />,
      label: 'Costs',
    }),
    [virtualLabId, projectId]
  );

  const collapseItems: CollapseProps['items'] = useMemo(
    () =>
      [costs].filter(
        (item) => Object.keys(item).length !== 0 // Filter-out any "empty" panels (ex. DangerZone when not admin).
      ),
    [costs]
  );

  return (
    <Collapse
      className="my-10 flex flex-col gap-1 text-primary-8"
      items={collapseItems}
      activeKey={activePanelKey}
      onChange={onChangePanel}
    />
  );
}

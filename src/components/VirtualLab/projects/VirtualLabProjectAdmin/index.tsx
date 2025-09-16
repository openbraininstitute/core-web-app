'use client';

import { useMemo } from 'react';
import { useAtomValue } from 'jotai';
import { CollapseProps } from 'antd';
import { useQueryState } from 'nuqs';
import { loadable } from 'jotai/utils';

import CostsPanel from './CostPanel';
import DangerZonePanel from './DangerZonePanel';
import Collapse from '@/components/Collapse';
import { virtualLabProjectDetailsAtomFamily } from '@/state/virtual-lab/projects';

export default function VirtualLabProjectAdmin({
  virtualLabId,
  projectId,
}: {
  virtualLabId: string;
  projectId: string;
}) {
  const userIsAdmin = true;

  const [activePanelKey, setActivePanel] = useQueryState('panel', {
    clearOnDefault: true,
    defaultValue: '',
  });

  const projectDetail = useAtomValue(
    loadable(
      virtualLabProjectDetailsAtomFamily({
        virtualLabId,
        projectId,
      })
    )
  );

  const onChangePanel = (key: string | string[]) => setActivePanel(String(key));

  const costs = useMemo(
    () => ({
      key: 'costs',
      children: <CostsPanel virtualLabId={virtualLabId} projectId={projectId} />,
      label: 'Costs',
    }),
    [virtualLabId, projectId]
  );

  const dangerZone = useMemo(
    () =>
      projectDetail.state === 'hasData' && userIsAdmin
        ? {
            key: 'danger-zone',
            children: <DangerZonePanel />,
            label: 'Danger Zone',
          }
        : {},
    [userIsAdmin, projectDetail]
  );

  const collapseItems: CollapseProps['items'] = useMemo(
    () =>
      [costs, dangerZone].filter(
        (item) => Object.keys(item).length !== 0 // Filter-out any "empty" panels (ex. DangerZone when not admin).
      ),
    [costs, dangerZone]
  );

  return (
    <Collapse
      className="text-primary-8 my-10 flex flex-col gap-1"
      items={collapseItems}
      activeKey={activePanelKey}
      onChange={onChangePanel}
    />
  );
}

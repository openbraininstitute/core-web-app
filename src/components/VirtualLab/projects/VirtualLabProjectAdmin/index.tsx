'use client';

import { useCallback, useMemo } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { CollapseProps } from 'antd';
import { useQueryState } from 'nuqs';
import { loadable } from 'jotai/utils';

import CostsPanel from './CostPanel';
import DangerZonePanel from './DangerZonePanel';
import Collapse from '@/components/Collapse';
import {
  userProjectsAtom,
  virtualLabProjectDetailsAtomFamily,
  virtualLabProjectsAtomFamily,
} from '@/state/virtual-lab/projects';
import { deleteProject } from '@/services/virtual-lab/projects';

export default function VirtualLabProjectAdmin({
  virtualLabId,
  projectId,
}: {
  virtualLabId: string;
  projectId: string;
}) {
  const userIsAdmin = true;

  const refreshUserProjects = useSetAtom(userProjectsAtom);
  const refreshVirtualLabProjects = useSetAtom(virtualLabProjectsAtomFamily(virtualLabId));

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

  const onDeleteProject = useCallback(async (): Promise<void> => {
    await deleteProject(virtualLabId, projectId);

    virtualLabProjectDetailsAtomFamily.remove({
      virtualLabId,
      projectId,
    });

    await Promise.all([refreshVirtualLabProjects(), refreshUserProjects()]);
  }, [virtualLabId, projectId, refreshVirtualLabProjects, refreshUserProjects]);

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
            children: (
              <DangerZonePanel onClick={onDeleteProject} name={projectDetail.data?.name || ''} />
            ),
            label: 'Danger Zone',
          }
        : {},
    [onDeleteProject, userIsAdmin, projectDetail]
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
      className="my-10 flex flex-col gap-1 text-primary-8"
      items={collapseItems}
      activeKey={activePanelKey}
      onChange={onChangePanel}
    />
  );
}

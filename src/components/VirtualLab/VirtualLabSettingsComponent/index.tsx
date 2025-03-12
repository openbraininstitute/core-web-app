'use client';

/* eslint-disable @typescript-eslint/no-unused-vars */

import { useCallback, useMemo } from 'react';
import { useSetAtom, useAtomValue } from 'jotai';
import { loadable } from 'jotai/utils';
import { Spin } from 'antd';
import { CollapseProps } from 'antd/lib/collapse/Collapse';
import { CollapsibleType } from 'antd/lib/collapse/CollapsePanel';
import { LoadingOutlined } from '@ant-design/icons';
import { useQueryState } from 'nuqs';

import Billing from '../Billing';
import ProjectsPanel from './ProjectsPanel';
import FormPanel, { renderInput, renderTextArea } from './FormPanel';
import DangerZonePanel from './DangerZonePanel';
import CostsPanel from './CostsPanel';

import { deleteVirtualLab } from '@/services/virtual-lab/labs';
import { virtualLabDetailAtomFamily, virtualLabsOfUserAtom } from '@/state/virtual-lab/lab';
import useUpdateVirtualLab from '@/hooks/useUpdateVirtualLab';
import { VALID_EMAIL_REGEXP } from '@/util/utils';
import { VirtualLab } from '@/types/virtual-lab/lab';
import Collapse, { ExpandIcon } from '@/components/Collapse';

export default function VirtualLabSettingsComponent({ id }: { id: string }) {
  const userIsAdmin = true;
  const [activePanelKey, setActivePanel] = useQueryState('panel', {
    clearOnDefault: true,
    defaultValue: '',
  });
  const virtualLabDetail = useAtomValue(loadable(virtualLabDetailAtomFamily(id)));

  const refreshVirtualLabsOfUser = useSetAtom(virtualLabsOfUserAtom);

  const updateVirtualLab = useUpdateVirtualLab(id);

  const onChangePanel = (key: string | string[]) => setActivePanel(String(key));

  const onDeleteVirtualLab = useCallback(async (): Promise<VirtualLab> => {
    const { data } = await deleteVirtualLab(id);
    const { virtual_lab: virtualLab } = data;

    virtualLabDetailAtomFamily.remove(id);
    refreshVirtualLabsOfUser();

    return new Promise((resolve) => resolve(virtualLab)); // eslint-disable-line no-promise-executor-return
  }, [id, refreshVirtualLabsOfUser]);

  const header = useMemo(() => {
    return virtualLabDetail.state === 'hasData'
      ? {
          key: 'header',
          collapsible: 'disabled' as CollapsibleType, // Type-casting shouldn't be necessary here, but it is for some reason.
          showArrow: false,
          label: (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between bg-primary-8 text-white">
                {virtualLabDetail.data?.name}
                <div className="text-primary-2">
                  Total budget: <span>$ {virtualLabDetail.data?.budget ?? 0}</span>
                </div>
              </div>
              <div className="flex flex-col gap-3 bg-primary-8 text-white">
                <div className="h-3 overflow-hidden rounded-full bg-primary-3">
                  <div className="h-full w-[60%] bg-white" />
                </div>
                <div className="flex justify-between text-base font-light">
                  <div className="flex flex-row gap-3">
                    Total spent
                    <span className="font-bold">$ N/A</span>
                  </div>
                  <div className="flex flex-row gap-3 text-primary-3">
                    Remaining: <span className="font-bold">$ N/A</span>
                  </div>
                </div>
              </div>
            </div>
          ),
          style: { background: '#003A8C' },
          headerClass: '!text-white font-bold !items-center', // TODO: See whether there's a better way to align center.
        }
      : {};
  }, [virtualLabDetail]);

  const settings = useMemo(
    () =>
      virtualLabDetail.state === 'hasData'
        ? {
            key: 'settings',
            children: (
              <FormPanel
                className="grid grid-cols-2 gap-x-6"
                initialValues={{
                  name: virtualLabDetail.data?.name,
                  reference_email: virtualLabDetail.data?.reference_email,
                  entity: virtualLabDetail.data?.entity,
                  description: virtualLabDetail.data?.description,
                }}
                items={[
                  {
                    className: 'col-span-2',
                    children: renderInput,
                    label: 'Lab Name',
                    name: 'name',
                    required: true,
                    rules: [{ max: 250 }],
                  },
                  {
                    className: 'col-span-2',
                    children: renderTextArea,
                    label: 'Description',
                    name: 'description',
                  },
                  {
                    children: renderInput,
                    label: 'Reference email',
                    name: 'reference_email',
                    type: 'email',
                    required: true,
                    // TODO: Figure-out whether "rules" prop is actually useful.
                    rules: [
                      {
                        required: true,
                        pattern: VALID_EMAIL_REGEXP,
                        message: 'Entered value is not the correct email format',
                      },
                    ],
                  },
                  {
                    children: renderInput,
                    label: 'Affiliated entity',
                    name: 'entity',
                  },
                ]}
                name="settings" // TODO: Check whether this prop is necessary.
                onValuesChange={updateVirtualLab}
              />
            ),
            label: 'Lab Settings',
          }
        : {},
    [updateVirtualLab, virtualLabDetail]
  );

  const costs = useMemo(
    () => ({
      key: 'costs',
      children: <CostsPanel virtualLabId={id} />,
      label: 'Costs',
    }),
    [id]
  );

  const budget = useMemo(
    () => ({
      key: 'project-budget',
      children: <ProjectsPanel expandIcon={ExpandIcon} virtualLabId={id} />,
      label: 'Budgets',
    }),
    [id]
  );

  const billing = useMemo(
    () => ({
      key: 'billing',
      children: <Billing virtualLabId={id} />,
      label: 'Billing',
    }),
    [id]
  );

  const dangerZone = useMemo(
    () =>
      virtualLabDetail.state === 'hasData' && userIsAdmin
        ? {
            key: 'danger-zone',
            children: (
              <DangerZonePanel
                onClick={onDeleteVirtualLab}
                name={virtualLabDetail.data?.name || ''}
              />
            ),
            label: 'Danger Zone',
          }
        : {},
    [onDeleteVirtualLab, userIsAdmin, virtualLabDetail]
  );

  const collapseItems: CollapseProps['items'] = useMemo(
    () =>
      // [header, costs, settings, plan, budget, billing, dangerZone].filter(
      [costs, settings, dangerZone].filter(
        (item) => Object.keys(item).length !== 0 // Filter-out any "empty" panels (ex. DangerZone when not admin).
      ),
    // [header, costs, settings, plan, budget, billing, dangerZone]
    [costs, settings, dangerZone]
  );

  if (virtualLabDetail.state === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spin size="large" indicator={<LoadingOutlined />} />
      </div>
    );
  }

  if (virtualLabDetail.state === 'hasError') {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="rounded-lg border p-8">
          {(virtualLabDetail.error as Error).message === 'Status: 404' ? (
            <>Virtual Lab not found</>
          ) : (
            <>Something went wrong when fetching virtual lab</>
          )}
        </div>
      </div>
    );
  }

  return (
    <Collapse
      className="my-10 flex flex-col gap-1 text-primary-8"
      items={collapseItems}
      activeKey={activePanelKey}
      onChange={onChangePanel}
    />
  );
}

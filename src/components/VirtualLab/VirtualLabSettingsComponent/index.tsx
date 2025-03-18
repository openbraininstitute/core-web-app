'use client';

/* eslint-disable @typescript-eslint/no-unused-vars */

import { useCallback, useMemo } from 'react';
import { useSetAtom, useAtomValue } from 'jotai';
import { loadable } from 'jotai/utils';
import { Spin } from 'antd';
import { CollapseProps } from 'antd/lib/collapse/Collapse';
import { LoadingOutlined } from '@ant-design/icons';
import { useQueryState } from 'nuqs';

import Billing from '../Billing';
import ProjectsPanel from './ProjectsPanel';
import FormPanel, { renderInput, renderTextArea } from './FormPanel';
import DangerZonePanel from './DangerZonePanel';
import CreditManagement from './CreditManagement';
import SpendingsPanel from './Spendings';

import BuyCredits from '@/components/VirtualLab/create-entity-flows/subscription/standalone-credits/buy-credits';
import PurchasesHistory from '@/components/VirtualLab/VirtualLabSettingsComponent/purchases-history';
import { deleteVirtualLab } from '@/services/virtual-lab/labs';
import {
  virtualLabBalanceAtomFamily,
  virtualLabDetailAtomFamily,
  virtualLabsOfUserAtom,
} from '@/state/virtual-lab/lab';
import useUpdateVirtualLab from '@/hooks/useUpdateVirtualLab';
import { classNames, VALID_EMAIL_REGEXP } from '@/util/utils';
import { VirtualLab } from '@/types/virtual-lab/lab';
import Collapse, { ExpandIcon } from '@/components/Collapse';
import { useLastTruthyValue } from '@/hooks/hooks';

function VirtualLabBlock({
  virtualLabId,
  className,
}: {
  virtualLabId: string;
  className?: string;
}) {
  const virtualLabBalance = useLastTruthyValue(virtualLabBalanceAtomFamily({ virtualLabId }));

  return (
    <div
      className={classNames(
        'flex w-full justify-between border-2 border-primary-3 p-6 text-white',
        className
      )}
    >
      <h2 className="text-2xl font-bold">Virtual Lab</h2>

      <div className="flex items-center gap-2 border border-primary-3 px-4 py-2">
        <span className="text-sm text-primary-2">Credit balance</span>
        <span className="text-lg font-semibold">{virtualLabBalance?.data.balance ?? ''}</span>
      </div>
    </div>
  );
}

function CollapsibleLabel({ text, description }: { text: string; description: string }) {
  return (
    <span className="font-bold">
      {text}
      {description && (
        <span className="ml-4 text-base font-normal text-gray-500">{description}</span>
      )}
    </span>
  );
}

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

  const creditManagement = useMemo(
    () => ({
      key: 'creditManagement',
      label: (
        <CollapsibleLabel
          text="Credit management"
          description="Allocate credits to your virtual lab's projects"
        />
      ),
      children: <CreditManagement virtualLabId={id} />,
    }),
    [id]
  );

  const purchases = useMemo(
    () => ({
      key: 'purchases',
      label: <CollapsibleLabel text="Purchases" description="View details about your purchases" />,
      children: <PurchasesHistory />,
    }),
    []
  );

  const spendings = useMemo(
    () => ({
      key: 'spendings',
      label: (
        <CollapsibleLabel
          text="Spendings"
          description="View all the activities that used credits"
        />
      ),
      children: <SpendingsPanel virtualLabId={id} />,
    }),
    [id]
  );

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
      [creditManagement, purchases, spendings, settings, dangerZone].filter(
        (item) => Object.keys(item).length !== 0 // Filter-out any "empty" panels (ex. DangerZone when not admin).
      ),
    [creditManagement, purchases, spendings, settings, dangerZone]
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
    <div className="p-y-8">
      <VirtualLabBlock className="mt-8" virtualLabId={id} />

      <Collapse
        className="my-10 flex flex-col gap-1 text-primary-8"
        items={collapseItems}
        activeKey={activePanelKey}
        onChange={onChangePanel}
      />
      <div className="mb-4 flex w-full justify-end">
        <BuyCredits />
      </div>
    </div>
  );
}

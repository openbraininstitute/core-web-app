'use client';

import { get } from 'es-toolkit/compat';
import { Suspense } from 'react';
import { match } from 'ts-pattern';

import {
  ScanConfigMainOverlayProvider,
  useScanConfigMainOverlayOptional,
} from '@/features/scan-config/bridge/main-overlay-context';
import TabsSelector from '@/features/scan-config/components/tabs-selector';
import { ScanConfigActivity } from '@/features/scan-config/types';
import { BuildTab } from '@/features/scan-config/use-cases/build/results';
import { ExtractionTab } from '@/features/scan-config/use-cases/extraction/results';
import { OptimizationTab } from '@/features/scan-config/use-cases/optimization/results';
import SimulationsTab from '@/features/scan-config/use-cases/simulations/results';
import { SkeletonizationTab } from '@/features/scan-config/use-cases/skeletonization/results';
import { messages } from '@/i18n/en/scan-config';
import { ButtonCopyId } from '@/ui/molecules/button-copy-id';
import { cn } from '@/utils/css-class';

import { DEFAULT_COLUMNS_GRID, DefaultConfigColumns } from './default-columns';
import {
  EMODEL_OPTIMISATION_COLUMNS_GRID,
  EModelOptimisationColumns,
} from './emodel-optimisation-columns';
import { type ScanConfigTemplateState, useScanConfigTemplate } from './use-scan-config-template';

import type { ScanConfigTemplateProps } from './types';

export function ScanConfigTemplate(props: ScanConfigTemplateProps) {
  return (
    <ScanConfigMainOverlayProvider>
      <ScanConfigTemplateContent {...props} />
    </ScanConfigMainOverlayProvider>
  );
}

function ScanConfigTemplateContent(props: ScanConfigTemplateProps) {
  const state = useScanConfigTemplate(props);
  const browseOverlay = useScanConfigMainOverlayOptional()?.overlay;
  const { isConfigurationTab, isEModelOptimisationParameters } = state;

  return (
    <div className={cn('flex h-full flex-col', props.className)}>
      <header
        id="template-header"
        className={cn('flex flex-nowrap justify-between items-center gap-4 pt-4 pb-2')}
      >
        <TabsSelector
          activity={props.activity}
          tab={state.tab}
          setTab={state.setTab}
          disableResultsTab={!state.campaignId || state.loading}
          disableConfigurationTab={Boolean(!props.initialConfig && props.readOnly)}
        />
        <div className="flex items-center justify-center gap-8">
          {!!state.campaignId && (
            <ButtonCopyId
              label={get(messages, `${props.activity}.CopyCampaignId`)}
              value={state.campaignId}
            />
          )}
        </div>
      </header>

      <div id="template-separator" className="w-full h-px bg-gray-200 my-2 px-3" />
      <div id="template-content" className="flex-1 min-h-0">
        {isConfigurationTab && browseOverlay ? (
          <div
            id="scan-config-model-selection-overlay"
            data-testid="scan-config-model-picker"
            // the picker replaces the whole main area — fade + slight rise on open
            // so it reads as a panel arriving, not a hard cut. entry-only (no JS);
            // reduced motion keeps the fade, drops the movement
            className={cn(
              'h-[calc(100%-0.5rem)] min-h-0',
              'transition-[opacity,transform] duration-200 ease-[var(--ease-out-expo)]',
              'starting:opacity-0 starting:translate-y-1.5 motion-reduce:starting:translate-y-0'
            )}
          >
            <Suspense fallback={<div className="h-full w-full rounded-2xl bg-gray-50" />}>
              {browseOverlay}
            </Suspense>
          </div>
        ) : null}
        <div
          id="scan-config-content-columns"
          className={cn(
            'py-2',
            {
              'grid gap-[5px] h-full overflow-hidden *:min-w-0':
                isConfigurationTab && !browseOverlay,
              [EMODEL_OPTIMISATION_COLUMNS_GRID]:
                isConfigurationTab && !browseOverlay && isEModelOptimisationParameters,
              [DEFAULT_COLUMNS_GRID]:
                isConfigurationTab && !browseOverlay && !isEModelOptimisationParameters,
            },
            { hidden: !isConfigurationTab || Boolean(browseOverlay) }
          )}
        >
          {isEModelOptimisationParameters ? (
            <EModelOptimisationColumns props={props} state={state} />
          ) : (
            <DefaultConfigColumns props={props} state={state} />
          )}
        </div>
        <div
          id="scan-config-results"
          data-testid="scan-config-results"
          className={cn(
            'w-full grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,2fr)] gap-[5px] h-full overflow-hidden',
            { hidden: isConfigurationTab },
            { 'h-full': !isConfigurationTab }
          )}
        >
          <ScanConfigResults props={props} state={state} />
        </div>
      </div>
    </div>
  );
}

/** Results tab content, selected by activity. */
function ScanConfigResults({
  props,
  state,
}: {
  props: ScanConfigTemplateProps;
  state: ScanConfigTemplateState;
}) {
  return match(props.activity)
    .with(ScanConfigActivity.Simulate, () => (
      <Suspense>
        <SimulationsTab
          campaignId={state.campaignId}
          virtualLabId={props.virtualLabId}
          projectId={props.projectId}
          campaignOriginAction={props.campaignOriginAction}
          isCampaignIdChanged={state.isCampaignIdChanged}
          taskTypeBindings={props.taskTypeBindings}
        />
      </Suspense>
    ))
    .with(ScanConfigActivity.Extract, () =>
      props.taskTypeBindings ? (
        <Suspense>
          <ExtractionTab
            isCampaignIdChanged={state.isCampaignIdChanged}
            campaignOriginAction={props.campaignOriginAction}
            campaignId={state.campaignId}
            taskTypeBindings={props.taskTypeBindings}
          />
        </Suspense>
      ) : null
    )
    .with(ScanConfigActivity.Process, () =>
      props.taskTypeBindings ? (
        <Suspense>
          <SkeletonizationTab
            campaignId={state.campaignId}
            virtualLabId={props.virtualLabId}
            projectId={props.projectId}
            campaignOriginAction={props.campaignOriginAction}
            isCampaignIdChanged={state.isCampaignIdChanged}
            taskTypeBindings={props.taskTypeBindings}
          />
        </Suspense>
      ) : null
    )
    .with(ScanConfigActivity.Build, () =>
      props.taskTypeBindings ? (
        <Suspense>
          <BuildTab
            isCampaignIdChanged={state.isCampaignIdChanged}
            campaignOriginAction={props.campaignOriginAction}
            campaignId={state.campaignId}
            taskTypeBindings={props.taskTypeBindings}
          />
        </Suspense>
      ) : null
    )
    .with(ScanConfigActivity.Optimize, () => <OptimizationTab />)
    .otherwise(() => {
      throw new Error(`${props.activity} is not supported yet`);
    });
}

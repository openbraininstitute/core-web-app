'use client';

import { get } from 'es-toolkit/compat';
import { useSetAtom } from 'jotai';
import { Activity, Suspense, useEffect } from 'react';
import { match } from 'ts-pattern';

import {
  ScanConfigMainOverlayProvider,
  useScanConfigMainOverlayOptional,
} from '@/features/scan-config/bridge/main-overlay-context';
import ScanConfigTabsPanel from '@/features/scan-config/components/tabs';
import { IonChannelModelPropertiesChecks } from '@/features/scan-config/components/ui-elements/ion-channel-model-properties';
import { ScanConfigActivity } from '@/features/scan-config/types';
import { BuildTab } from '@/features/scan-config/use-cases/build/results';
import { ExtractionTab } from '@/features/scan-config/use-cases/extraction/results';
import { OptimizationTab } from '@/features/scan-config/use-cases/optimization/results';
import SimulationsTab from '@/features/scan-config/use-cases/simulations/results';
import { SkeletonizationTab } from '@/features/scan-config/use-cases/skeletonization/results';
import {
  ScanConfigWorkflowBreadcrumb,
  ScanConfigWorkflowSummary,
} from '@/features/scan-config/workflow/breadcrumb';
import { workflowBreadcrumbEntitiesAtom } from '@/features/scan-config/workflow/breadcrumb-entities';
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
  const setBreadcrumbEntities = useSetAtom(workflowBreadcrumbEntitiesAtom);

  // The breadcrumb's entities are module state that outlives the route. Clearing in a
  // cleanup keyed on `schemaName` fires on unmount *and* on a workflow switch, and — unlike
  // an effect body — runs before the next workflow's model selectors publish their own.
  // biome-ignore lint/correctness/useExhaustiveDependencies: `schemaName` is the key, not a read — it is what makes the cleanup fire on a workflow switch
  useEffect(() => () => setBreadcrumbEntities([]), [props.schemaName, setBreadcrumbEntities]);

  const configurationContent = (
    <div id="template-content" className="flex min-h-0 flex-1 flex-col px-2 pt-6 pb-2">
      {!props.readOnly && (
        <IonChannelModelPropertiesChecks
          schema={props.schema}
          config={state.config}
          setConfig={state.setConfig}
          locked={state.editingLocked}
        />
      )}
      {browseOverlay ? (
        <div
          id="scan-config-model-selection-overlay"
          data-testid="scan-config-model-picker"
          // the picker replaces the whole main area — fade + slight rise on open
          // so it reads as a panel arriving, not a hard cut. entry-only (no JS);
          // reduced motion keeps the fade, drops the movement
          className={cn(
            'min-h-0 flex-1',
            'transition-[opacity,transform] duration-200 ease-out-expo',
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
          'grid gap-[5px] min-h-0 flex-1 overflow-hidden *:min-w-0',
          isEModelOptimisationParameters ? EMODEL_OPTIMISATION_COLUMNS_GRID : DEFAULT_COLUMNS_GRID,
          { hidden: Boolean(browseOverlay) }
        )}
      >
        {isEModelOptimisationParameters ? (
          <EModelOptimisationColumns props={props} state={state} />
        ) : (
          <DefaultConfigColumns props={props} state={state} />
        )}
      </div>
    </div>
  );

  const resultsContent = (
    <Activity mode={isConfigurationTab ? 'hidden' : 'visible'} name="scan-config-results">
      <div
        id="scan-config-results"
        data-testid="scan-config-results"
        className="w-full grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,2fr)] gap-1.25 min-h-0 flex-1 overflow-hidden px-2 pt-6 pb-2"
      >
        <ScanConfigResults props={props} state={state} />
      </div>
    </Activity>
  );

  return (
    <div className={cn('flex h-full min-h-0 flex-col', props.className)}>
      <ScanConfigTabsPanel
        className="min-h-0 flex-1"
        activity={props.activity}
        tab={state.tab}
        setTab={state.setTab}
        disableResultsTab={!state.campaignId || state.loading}
        disableConfigurationTab={Boolean(!props.initialConfig && props.readOnly)}
        configuration={configurationContent}
        results={resultsContent}
        railCenter={
          <ScanConfigWorkflowSummary
            action={
              state.campaignId ? (
                <ButtonCopyId
                  iconOnly
                  label={get(messages, `${props.activity}.CopyCampaignId`)}
                  tooltip={get(messages, `${props.activity}.CopyCampaignId`)}
                  value={state.campaignId}
                  classNames={{
                    button: 'size-6 p-0',
                    // bare glyph at rest; the chip only materialises under the pointer
                    icon: cn(
                      'size-6 rounded-full border-transparent bg-transparent transition-colors',
                      'hover:border-primary-8 hover:bg-primary-8 hover:[&_svg]:text-white'
                    ),
                    glyph: 'size-3.5 text-primary-9',
                  }}
                />
              ) : null
            }
          />
        }
        railEnd={<ScanConfigWorkflowBreadcrumb />}
      />
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
          campaignOriginAction={props.campaignOriginAction}
          isCampaignIdChanged={state.isCampaignIdChanged}
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
    .with(ScanConfigActivity.Optimize, () =>
      props.taskTypeBindings ? (
        <Suspense>
          <OptimizationTab
            isCampaignIdChanged={state.isCampaignIdChanged}
            campaignOriginAction={props.campaignOriginAction}
            campaignId={state.campaignId}
            taskTypeBindings={props.taskTypeBindings}
          />
        </Suspense>
      ) : null
    )
    .otherwise(() => {
      throw new Error(`${props.activity} is not supported yet`);
    });
}

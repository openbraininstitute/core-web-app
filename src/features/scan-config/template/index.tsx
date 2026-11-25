'use client';

import { get } from 'es-toolkit/compat';
import { Activity, Suspense } from 'react';
import { match, P } from 'ts-pattern';

import { DefaultLookupProvider } from '@/features/scan-config/bridge/default-lookup-context';
import {
  ScanConfigMainOverlayProvider,
  useScanConfigMainOverlayOptional,
} from '@/features/scan-config/bridge/main-overlay-context';
import {
  checksMEModelCompatibility,
  MEModelCompatibilityCheck,
} from '@/features/scan-config/components/memodel-compatibility';
import { ScanConfigTabsPanel } from '@/features/scan-config/components/tabs';
import { IonChannelModelPropertiesChecks } from '@/features/scan-config/components/ui-elements/ion-channel-model-properties';
import { ScanConfigConfigEffects } from '@/features/scan-config/template/config-effects';
import { DefaultConfigColumns } from '@/features/scan-config/template/default-columns';
import {
  EMODEL_OPTIMISATION_COLUMNS_GRID,
  EModelOptimisationColumns,
} from '@/features/scan-config/template/emodel-optimisation-columns';
import { useScanConfigTemplate } from '@/features/scan-config/template/use-scan-config-template';
import { NEURON_SETS_SECTION, ScanConfigActivity } from '@/features/scan-config/types';
import { BuildTab } from '@/features/scan-config/use-cases/build/results';
import { ExtractionTab } from '@/features/scan-config/use-cases/extraction/results';
import {
  OptimizationTab,
  type TTaskNoun,
} from '@/features/scan-config/use-cases/optimization/results';
import { SimulationsTab } from '@/features/scan-config/use-cases/simulations/results';
import { SkeletonizationTab } from '@/features/scan-config/use-cases/skeletonization/results';
import {
  ScanConfigErrorsProvider,
  ScanConfigStoreProvider,
  useConfigValue,
} from '@/features/scan-config/use-config-store';
import { BreadcrumbChip } from '@/ui/molecules/breadcrumb';
import { ButtonCopyId } from '@/ui/molecules/button-copy-id';
import { MiddleEllipsis } from '@/ui/molecules/middle-ellipsis';
import { cn } from '@/utils/css-class';

import type { ScanConfigTemplateProps } from '@/features/scan-config/template/types';
import type { ScanConfigTemplateState } from '@/features/scan-config/template/use-scan-config-template';
import type { Config } from '@/features/scan-config/types';

/** Optimize and Validate share one results tab; this is the only thing that differs. */
const TASK_NOUN = {
  [ScanConfigActivity.Optimize]: { singular: 'optimization', plural: 'optimizations' },
  [ScanConfigActivity.Validate]: { singular: 'validation', plural: 'validations' },
} as const satisfies Record<string, TTaskNoun>;

export function ScanConfigTemplate(props: ScanConfigTemplateProps) {
  return (
    <ScanConfigMainOverlayProvider>
      <DefaultLookupProvider>
        <ScanConfigTemplateContent {...props} />
      </DefaultLookupProvider>
    </ScanConfigMainOverlayProvider>
  );
}

function ScanConfigTemplateContent(props: ScanConfigTemplateProps) {
  const state = useScanConfigTemplate(props);
  const browseOverlay = useScanConfigMainOverlayOptional()?.overlay;
  const { isConfigurationTab, isEModelOptimisationParameters } = state;

  const configurationContent = (
    <div
      id="template-content"
      // Edge to edge, so the windows' rings meet the toolbar's ends (the project selector, the
      // assistant); the e-model layout, unboxed, keeps its inset.
      className={cn(
        'flex min-h-0 flex-1 flex-col pt-2',
        isEModelOptimisationParameters ? 'px-2 pb-3' : 'px-0'
      )}
    >
      <ConfigChecks props={props} locked={state.editingLocked} />
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
          'min-h-0 flex-1 overflow-hidden',
          // The default layout lays out its own grid, whose columns can be dragged shut.
          isEModelOptimisationParameters
            ? cn('grid gap-1.25 *:min-w-0', EMODEL_OPTIMISATION_COLUMNS_GRID)
            : 'flex',
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
        // Edge to edge, as the configuration's, so its windows meet the toolbar's ends.
        className="w-full grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,2fr)] gap-1.25 min-h-0 flex-1 overflow-hidden pt-2"
      >
        <ScanConfigResults props={props} state={state} />
      </div>
    </Activity>
  );

  return (
    <ScanConfigStoreProvider store={state.configStore}>
      <ScanConfigErrorsProvider schema={props.schema} initialConfig={state.initialConfig}>
        <ScanConfigConfigEffects props={props} />
        <div className={cn('flex h-full min-h-0 flex-col', props.className)}>
          <ScanConfigTabsPanel
            className="min-h-0 flex-1"
            activity={props.activity}
            tab={state.tab}
            setTab={state.setTab}
            disableResultsTab={!state.campaignId || state.loading || Boolean(props.hideTabs)}
            disableConfigurationTab={Boolean(!props.initialConfig && props.readOnly)}
            configuration={configurationContent}
            results={resultsContent}
            // the centre copy button exists only once a campaign has been generated (its id is known)
            railCenter={
              state.campaignId ? <CampaignCopyChip campaignId={state.campaignId} /> : undefined
            }
          />
        </div>
      </ScanConfigErrorsProvider>
    </ScanConfigStoreProvider>
  );
}

function ConfigChecks({ props, locked }: { props: ScanConfigTemplateProps; locked: boolean }) {
  return (
    <>
      {!props.readOnly && <IonChannelModelPropertiesChecks schema={props.schema} locked={locked} />}
      {checksMEModelCompatibility(props) && <MEModelCompatibilityCheck />}
    </>
  );
}

const selectCampaignName = (config: Config) => get(config, 'info.campaign_name');

const selectNeuronSets = (config: Config) => config.neuron_sets;

function CampaignCopyChip({ campaignId }: { campaignId: string }) {
  const configuredName = useConfigValue(selectCampaignName);
  const campaignName =
    typeof configuredName === 'string' && configuredName ? configuredName : campaignId;

  return (
    <BreadcrumbChip className="max-w-full px-1">
      <ButtonCopyId
        value={campaignId}
        label={`Copy ${campaignName}`}
        // hover and keyboard focus both show the full name the visible text elides
        tooltip={campaignName}
        className="min-w-0"
        classNames={{
          button: 'h-8 min-w-0 shrink gap-1 pr-0 pl-3',
          icon: 'size-6 shrink-0 border-transparent',
          glyph: 'size-3.5 text-primary-9',
          tooltip: 'max-w-72 text-wrap break-words bg-white text-primary-9 shadow-lg',
          tooltipArrow: 'bg-white!',
        }}
      >
        <b className="flex min-w-0 text-base font-bold">
          <MiddleEllipsis text={campaignName} />
        </b>
      </ButtonCopyId>
    </BreadcrumbChip>
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
  const neuronSets = useConfigValue(selectNeuronSets);

  return match(props.activity)
    .with(ScanConfigActivity.Simulate, () => (
      <Suspense>
        <SimulationsTab
          campaignId={state.campaignId}
          campaignOriginAction={props.campaignOriginAction}
          isCampaignIdChanged={state.isCampaignIdChanged}
          neuronSetNames={neuronSetNamesOf(props.initialConfig, { neuron_sets: neuronSets })}
          configSchema={props.schema}
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
    .with(P.union(ScanConfigActivity.Optimize, ScanConfigActivity.Validate), (activity) =>
      props.taskTypeBindings ? (
        <Suspense>
          <OptimizationTab
            isCampaignIdChanged={state.isCampaignIdChanged}
            campaignOriginAction={props.campaignOriginAction}
            campaignId={state.campaignId}
            taskTypeBindings={props.taskTypeBindings}
            noun={TASK_NOUN[activity]}
          />
        </Suspense>
      ) : null
    )
    .otherwise(() => {
      throw new Error(`${props.activity} is not supported yet`);
    });
}

/**
 * The neuron sets the campaign's config defines, by name: the loaded config's
 * and any the form has added since. The output viewers keep only those the
 * simulation's node sets file holds, so a name it never ran with drops out.
 */
function neuronSetNamesOf(...configs: unknown[]): string[] {
  const names = new Set<string>();
  for (const config of configs) {
    const sets = get(config, NEURON_SETS_SECTION);
    if (sets && typeof sets === 'object') for (const name of Object.keys(sets)) names.add(name);
  }
  return [...names];
}

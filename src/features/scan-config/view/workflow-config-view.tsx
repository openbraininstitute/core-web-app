'use client';

import { omit } from 'es-toolkit';
import { useLayoutEffect, useMemo } from 'react';
import { match } from 'ts-pattern';

import { DefaultLookupProvider } from '@/features/scan-config/bridge/default-lookup-context';
import {
  ScanConfigEntityPreviewOrigin,
  usePreviewRecord,
} from '@/features/scan-config/bridge/entity-preview';
import { ScanConfigMainOverlayProvider } from '@/features/scan-config/bridge/main-overlay-context';
import { useScanConfigSettingsPanel } from '@/features/scan-config/bridge/settings-panel';
import { compileConfigValidator } from '@/features/scan-config/components/hooks';
import { useObioneJsonSchema } from '@/features/scan-config/components/hooks/schema';
import { useScanConfiguration } from '@/features/scan-config/components/hooks/use-scan-configuration';
import {
  RightPreviewModeDict,
  resolveRightPreviewMode,
} from '@/features/scan-config/components/model-preview/helpers';
import { IonChannelModelsPanel } from '@/features/scan-config/components/ui-blocks/emodel-optimisation/ion-channel-models-panel';
import {
  assignedModelIds,
  availableDistributions,
  readMechanisms,
} from '@/features/scan-config/components/ui-blocks/emodel-optimisation/mechanism-regions';
import { RegionModelDetail } from '@/features/scan-config/components/ui-blocks/emodel-optimisation/region-model-detail';
import { Middle } from '@/features/scan-config/components/ui-columns';
import { EntityPreviewPane, Right } from '@/features/scan-config/components/ui-columns/right';
import { ScanConfigCampaignOriginActionDict } from '@/features/scan-config/helpers';
import { useScanConfigTemplate } from '@/features/scan-config/template/use-scan-config-template';
import {
  type Config,
  type ConfigSchema,
  EMODEL_OPTIMISATION_MECHANISMS_TABS,
  EModelOptimisationMechanismsTabs,
  type IEModelOptimisationParameters,
  isType,
  ScanConfigUIElementDict,
  type TScanConfigActivity,
} from '@/features/scan-config/types';
import { JsonView } from '@/ui/segments/detail-view/json-view';
import { cn } from '@/utils/css-class';

import type { ReactNode } from 'react';
import type { EntityCoreObjectTypes } from '@/api/entitycore/types';
import type { TViewVariant } from '@/constants';
import type { ScanConfigTemplateProps } from '@/features/scan-config/template/types';
import type { ScanConfigTemplateState } from '@/features/scan-config/template/use-scan-config-template';
import type { Json } from '@/ui/segments/detail-view/json-view';
import type { TScanConfigRegistryConfig } from '@/ui/segments/workflows/config/scan-config-binding';

import styles from './workflow-config-view.module.css';

/** What a single-coordinate config adds to the scan config it extends (obi-one `SingleConfigMixin`). */
const SINGLE_CONFIG_KEYS = [
  'idx',
  'scan_output_root',
  'coordinate_output_root',
  'obi_one_version',
  'single_coordinate_scan_params',
];

/**
 * A config as the form of its workflow's scan config. A single-coordinate config is its scan
 * config with one value per field, plus a few run keys and its own `type`; a scan config passes
 * through as it is.
 */
export function toScanConfigForm(config: Record<string, Json>, schema: ConfigSchema): Config {
  return { ...omit(config, SINGLE_CONFIG_KEYS), type: schema.properties.type.const } as Config;
}

/** The config's root blocks the workflow shows, in the config's own key order. */
export function viewRootElements(schema: ConfigSchema, config: Config): string[] {
  return Object.keys(config).filter((key) => {
    const spec = schema.properties[key];
    return spec && !isType(spec) && !spec.ui_hidden;
  });
}

type Props = {
  scanConfig: TScanConfigRegistryConfig;
  activity: TScanConfigActivity;
  config: Record<string, Json>;
  /** the campaign the config belongs to: it keeps the form read-only */
  campaignId: string;
  virtualLabId: string;
  projectId: string;
  variant: TViewVariant;
  /** the workflow's config and output links: shown only once the workflow form opens the config */
  links: ReactNode;
};

/**
 * Read-only view of the config a model was made with, drawn with its workflow's own form blocks
 * on a flat white surface. A config the current workflow schema rejects is shown as JSON.
 */
export function WorkflowConfigView(props: Props) {
  const { schema, isLoading } = useObioneJsonSchema({ schemaName: props.scanConfig.schemaName });
  const form = useMemo(
    () => (schema ? toScanConfigForm(props.config, schema) : null),
    [schema, props.config]
  );
  const valid = useMemo(
    () => (schema && form ? compileConfigValidator(schema)(form) : false),
    [schema, form]
  );

  if (isLoading) return <div className="h-96 w-full animate-pulse rounded-2xl bg-white/10" />;
  if (!form) {
    return (
      <RawConfig
        config={props.config}
        variant={props.variant}
        note="The workflow form could not be loaded, so the configuration is shown as it was saved."
      />
    );
  }
  if (!valid) {
    return (
      <RawConfig
        config={props.config}
        variant={props.variant}
        note={`This configuration was made with obi-one ${props.config.obi_one_version ?? 'of an earlier version'} and no longer matches the workflow, so it is shown as it was saved.`}
      />
    );
  }
  return <LoadedView {...props} form={form} />;
}

function RawConfig({
  config,
  variant,
  note,
}: {
  config: Json;
  variant: TViewVariant;
  note: string;
}) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm opacity-80">{note}</p>
      <JsonView value={config} variant={variant} />
    </div>
  );
}

function LoadedView({ form, ...props }: Props & { form: Config }) {
  const { isLoading, error, unresolvedMessage, ready } = useScanConfiguration({
    scanConfig: props.scanConfig,
    initialConfig: form,
    virtualLabId: props.virtualLabId,
    projectId: props.projectId,
    origin: props.campaignId,
    readOnly: true,
    activity: props.activity,
    campaignOriginAction: ScanConfigCampaignOriginActionDict.View,
  });

  if (isLoading) return <div className="h-96 w-full animate-pulse rounded-2xl bg-white/10" />;
  if (error || unresolvedMessage || !ready) {
    return (
      <RawConfig
        config={props.config}
        variant={props.variant}
        note={error?.message ?? unresolvedMessage ?? 'The workflow form could not be loaded.'}
      />
    );
  }

  return (
    <ScanConfigMainOverlayProvider>
      <DefaultLookupProvider>
        {props.links}
        <ViewBody {...ready} aiEnabled={false} hideTabs />
      </DefaultLookupProvider>
    </ScanConfigMainOverlayProvider>
  );
}

const pillClass = (active: boolean) =>
  cn(
    'rounded-full border px-3.5 py-1.5 text-sm transition-colors',
    active
      ? 'border-primary-9 bg-primary-9 font-semibold text-white'
      : 'border-neutral-2 text-primary-8 hover:bg-neutral-1'
  );

function ViewBody(props: ScanConfigTemplateProps) {
  const state = useScanConfigTemplate(props);
  // the loaded form, not the editor state: that is rebuilt in the schema's order
  const roots = viewRootElements(props.schema, props.initialConfig ?? state.config);
  const { setSelectedRootElement } = state;

  // the template opens on the schema's first block; the view opens on the config's
  // biome-ignore lint/correctness/useExhaustiveDependencies: only the first block, once
  useLayoutEffect(() => {
    if (roots[0]) setSelectedRootElement(roots[0]);
  }, [setSelectedRootElement]);

  return (
    <div
      className={cn(
        styles.view,
        'flex flex-col gap-5 rounded-2xl border border-neutral-2 bg-white p-5 text-primary-9'
      )}
    >
      <div className="flex flex-wrap gap-2" role="tablist">
        {roots.map((root) => {
          const spec = props.schema.properties[root];
          return (
            <button
              key={root}
              type="button"
              role="tab"
              aria-selected={state.selectedRootElement === root}
              className={pillClass(state.selectedRootElement === root)}
              onClick={() => setSelectedRootElement(root)}
            >
              {isType(spec) ? root : spec.title}
            </button>
          );
        })}
      </div>
      {state.isEModelOptimisationParameters ? (
        <EModelBody props={props} state={state} />
      ) : (
        <DefaultBody props={props} state={state} />
      )}
    </div>
  );
}

type BodyProps = { props: ScanConfigTemplateProps; state: ScanConfigTemplateState };

/** The selected block's fields, and beside them the workflow's preview whenever it has one. */
function DefaultBody({ props, state }: BodyProps) {
  const { preview, record, isLoading } = usePreviewRecord();
  const settingsPanel = useScanConfigSettingsPanel();
  const mode = resolveRightPreviewMode({
    settingsPanelActive: Boolean(settingsPanel),
    entityPreviewActive: Boolean(preview && (record || isLoading)),
    entityPreviewFromSelection: preview?.origin === ScanConfigEntityPreviewOrigin.Selection,
    activity: props.activity,
    entityType: props.entityType,
    hasEntity: Boolean(props.entity),
  });
  const showsPreview = mode !== RightPreviewModeDict.Empty;

  return (
    <div
      className={cn(
        'grid gap-6',
        showsPreview ? 'grid-cols-[minmax(0,2fr)_minmax(0,3fr)]' : 'grid-cols-1'
      )}
    >
      <RootContent props={props} state={state} />
      {/* always mounted: its hooks pin the preview a workflow opens on */}
      <div
        className={cn(
          'sticky top-0 h-[min(640px,70vh)] min-h-80 overflow-hidden rounded-xl border border-neutral-2',
          { hidden: !showsPreview }
        )}
      >
        <Right
          activity={props.activity}
          entityType={props.entityType}
          entity={props.entity}
          selectedEntry={state.selectedEntry}
          selectedRootElement={state.selectedRootElement}
          onCreateEntry={state.createEntry}
          config={state.config}
          setConfig={state.setConfig}
          schema={props.schema}
          schemaMappingConfig={props.schemaMappingConfig}
          locked
        />
      </div>
    </div>
  );
}

/** A block, or every entry of a block dictionary one under the other. */
function RootContent({ props, state }: BodyProps) {
  const { selectedSchema, selectedRootElement, config } = state;
  if (!selectedSchema) return null;

  const middle = (entry: string) => (
    <Middle
      key={`${selectedRootElement}_${entry}_${state.selectedMechanismsTab}`}
      schema={props.schema}
      selectedRootElement={selectedRootElement}
      editing
      selectedEntry={entry}
      setSelectedEntry={state.setSelectedEntry}
      campaignId={state.campaignId}
      loading={false}
      config={config}
      setConfig={state.setConfig}
      entity={props.entity}
      allEntries={state.allEntries}
      selectedSchema={selectedSchema}
      schemaMappingConfig={props.schemaMappingConfig}
      entityType={props.entityType}
      selectedMechanismsTab={state.selectedMechanismsTab}
      selectedRegionChoice={state.selectedRegionChoice}
      setSelectedRegionChoice={state.setSelectedRegionChoice}
      errors={null}
    />
  );

  if (selectedSchema.ui_element !== ScanConfigUIElementDict.BlockDictionary) {
    return <div className="min-w-0">{middle(state.selectedEntry)}</div>;
  }

  const entries = Object.keys((config[selectedRootElement] as object | undefined) ?? {});
  if (entries.length === 0) return <p className="text-sm text-neutral-4">None</p>;
  return (
    <div className="flex min-w-0 flex-col gap-6">
      {entries.map((entry) => (
        <section key={entry} className="flex flex-col gap-2">
          <h3 className="text-base font-semibold">{entry}</h3>
          {middle(entry)}
        </section>
      ))}
    </div>
  );
}

/**
 * The e-model optimisation block: its tab's cards in the first third, and in the rest what the
 * workflow opens in drawers, all at once since nothing is picked to edit. Opens on the parameters
 * of the first region that has models.
 */
function EModelBody({ props, state }: BodyProps) {
  const {
    selectedSchema,
    selectedRootElement,
    selectedMechanismsTab,
    setSelectedMechanismsTab,
    selectedRegionChoice,
    setSelectedRegionChoice,
    config,
  } = state;
  const rootSchema = selectedSchema as IEModelOptimisationParameters;
  const value = config[selectedRootElement];
  const choices = rootSchema.properties.base_parameters.choices;
  const choice = choices.find(({ name }) => name === selectedRegionChoice);
  const modelIds = choice ? assignedModelIds(readMechanisms(value), choice.name) : [];
  const { preview, record } = usePreviewRecord();

  // biome-ignore lint/correctness/useExhaustiveDependencies: opens once, on the first region
  useLayoutEffect(() => {
    const first = choices.find(
      ({ name }) => assignedModelIds(readMechanisms(value), name).length > 0
    );
    setSelectedMechanismsTab(EModelOptimisationMechanismsTabs.ParametersSelection);
    if (first) setSelectedRegionChoice(first.name);
  }, [setSelectedMechanismsTab, setSelectedRegionChoice]);

  const detail = match(selectedMechanismsTab)
    .with(EModelOptimisationMechanismsTabs.MechanismSelection, () =>
      preview ? (
        <div className="h-[min(640px,70vh)] overflow-hidden rounded-xl border border-neutral-2">
          <EntityPreviewPane
            dataType={preview.dataType}
            record={(record as EntityCoreObjectTypes | null) ?? null}
          />
        </div>
      ) : (
        <p className="text-sm text-neutral-4">Select a model to see it here.</p>
      )
    )
    .with(EModelOptimisationMechanismsTabs.RegionAssignment, () =>
      choice ? (
        <IonChannelModelsPanel
          choiceName={choice.name}
          choiceLabel={choice.label}
          choiceDescription={choice.description}
          rootSchema={rootSchema}
          value={value}
          onChange={() => {}}
          disabled
          errors={[]}
        />
      ) : null
    )
    .with(EModelOptimisationMechanismsTabs.ParametersSelection, () =>
      choice ? (
        <div className="flex flex-col gap-6">
          {modelIds.map((modelId) => (
            <RegionModelDetail
              key={`${choice.name}_${modelId}`}
              choiceName={choice.name}
              modelId={modelId}
              value={value}
              onChange={() => {}}
              disabled
              errors={[]}
              availableDistributions={availableDistributions(config)}
            />
          ))}
        </div>
      ) : null
    )
    .otherwise(() => null);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap gap-2" role="tablist">
        {EMODEL_OPTIMISATION_MECHANISMS_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={selectedMechanismsTab === tab.key}
            className={pillClass(selectedMechanismsTab === tab.key)}
            onClick={() => setSelectedMechanismsTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div
        className={cn(
          'grid gap-6',
          detail ? 'grid-cols-[minmax(0,1fr)_minmax(0,2fr)]' : 'grid-cols-1'
        )}
      >
        <RootContent props={props} state={state} />
        {detail && <div className="min-w-0">{detail}</div>}
      </div>
    </div>
  );
}

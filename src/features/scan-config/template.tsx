'use client';

import { get } from 'es-toolkit/compat';
import { useSetAtom } from 'jotai';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { match } from 'ts-pattern';

import {
  ScanConfigMainOverlayProvider,
  useScanConfigMainOverlayOptional,
} from '@/features/scan-config/bridge/main-overlay-context';
import { nextEntryName, useEntries } from '@/features/scan-config/components/hooks';
import { useConfig } from '@/features/scan-config/components/hooks/schema';
import { clearScanValueSelectionAtom } from '@/features/scan-config/components/model-preview/electrode-locations-overlay';
import ScanConfigTabsPanel from '@/features/scan-config/components/tabs';
import { Left, Middle, Right } from '@/features/scan-config/components/ui-columns';
import {
  getConfigKeyForEntity,
  ScanConfigCampaignOriginActionDict,
  type TScanConfigCampaignOriginActionDict,
} from '@/features/scan-config/helpers';
import { useScanConfigEditingLocked } from '@/features/scan-config/hooks/use-config-editing-locked';
import {
  type Config,
  type ConfigSchema,
  isType,
  ScanConfigActivity,
  ScanConfigDefaultTab,
  type SchemaName,
  type TScanConfigActivity,
  type TScanConfigTabs,
  type TSupportedEntitiesForScanConfiguration,
  type TSupportedEntityTypesForScanConfiguration,
} from '@/features/scan-config/types';
import { BuildTab } from '@/features/scan-config/use-cases/build/results';
import { ExtractionTab } from '@/features/scan-config/use-cases/extraction/results';
import SimulationsTab from '@/features/scan-config/use-cases/simulations/results';
import { SkeletonizationTab } from '@/features/scan-config/use-cases/skeletonization/results';
import {
  ScanConfigWorkflowBreadcrumb,
  ScanConfigWorkflowSummary,
} from '@/features/scan-config/workflow/breadcrumb';
import { workflowBreadcrumbEntitiesAtom } from '@/features/scan-config/workflow/breadcrumb-entities';
import { usePrevious } from '@/hooks/hooks';
import { messages } from '@/i18n/en/scan-config';
import { useAgentState, useAIConfig } from '@/services/ai-agent';
import { clearDiffStateAtom, expandedRootElementsAtom } from '@/state/config-highlights';
import { ButtonCopyId } from '@/ui/molecules/button-copy-id';
import { cn } from '@/utils/css-class';

import { diffBarDataAtom } from '../ai-assistant/chat/use-last-message-diff-bar';
import { showRestoreAtom } from '../ai-assistant/message-item/collapsible-message/collapsible-message';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { TSchemaMappingConfiguration } from '@/features/scan-config/components/hooks/schema';
import type { TWorkflowTaskTypeBindings } from '@/features/scan-config/workflow/types';
import type { TWorkflowSessionSelectionPayload } from '@/features/scan-config/workflow/workflow-session-selection';
import type { Nullish } from '@/utils/type';

import styles from '@/features/scan-config/scan-config.module.css';

type Props = {
  entity: TSupportedEntitiesForScanConfiguration | Nullish;
  virtualLabId: string;
  projectId: string;
  origin?: string;
  initialConfig?: Config;
  defaultTab?: TScanConfigTabs;
  readOnly?: boolean;
  className?: string;
  activity: TScanConfigActivity;
  campaignOriginAction: TScanConfigCampaignOriginActionDict;
  schemaMappingConfig: TSchemaMappingConfiguration | undefined;
  schema: ConfigSchema;
  schemaName: SchemaName;
  aiEnabled: boolean;
  generatedEndpoint: string;
  entityType: TSupportedEntityTypesForScanConfiguration;
  campaignEntityType?: TExtendedEntitiesTypeDict;
  workflowSessionSelection?: TWorkflowSessionSelectionPayload | null;
  resolveSessionFromIdType?: (browseType: TExtendedEntitiesTypeDict) => string | undefined;
  taskTypeBindings?: TWorkflowTaskTypeBindings;
};

export function ScanConfigTemplate(props: Props) {
  return (
    <ScanConfigMainOverlayProvider>
      <ScanConfigTemplateContent {...props} />
    </ScanConfigMainOverlayProvider>
  );
}

function ScanConfigTemplateContent({
  entity,
  virtualLabId,
  projectId,
  origin,
  initialConfig,
  defaultTab = ScanConfigDefaultTab,
  readOnly,
  className,
  activity = ScanConfigActivity.Simulate,
  schema,
  schemaName,
  schemaMappingConfig,
  aiEnabled,
  generatedEndpoint,
  entityType,
  campaignEntityType,
  campaignOriginAction,
  workflowSessionSelection,
  resolveSessionFromIdType,
  taskTypeBindings,
}: Props) {
  const browseOverlayContext = useScanConfigMainOverlayOptional();
  const browseOverlay = browseOverlayContext?.overlay;
  const [tab, setTab] = useState<TScanConfigTabs>(defaultTab);
  const firstRoot = Object.entries(schema.properties).find(([, spec]) => !isType(spec))?.[0];
  const [selectedRootElement, setSelectedRootElement] = useState(firstRoot ?? '');
  const [editing, setEditing] = useState(true);
  const [selectedEntry, setSelectedEntry] = useState('');

  const [loading, setLoading] = useState(false);
  const isDuplicate = campaignOriginAction === ScanConfigCampaignOriginActionDict.Duplicate;
  const [campaignId, setCampaignId] = useState(isDuplicate ? '' : (origin ?? ''));
  const [isEditingKey, setIsEditingKey] = useState(false);
  const [newKey, setNewKey] = useState('');
  const allEntries = useEntries({ initialConfig, schema });
  const [config, setConfig] = useConfig({
    schema,
    initialConfig,
    model: entity,
    origin,
    workflowSessionSelection,
    resolveFromIdType: resolveSessionFromIdType,
  });
  const editingLocked = useScanConfigEditingLocked({ campaignId, loading, readOnly });
  const setExpandedRootElements = useSetAtom(expandedRootElementsAtom);

  const createEntry = useCallback(
    (rootElement: string, block: Record<string, unknown>) => {
      const entry = nextEntryName(schema, rootElement, allEntries);
      allEntries.add(entry);

      setConfig(
        (previous) =>
          ({
            ...previous,
            [rootElement]: { ...(previous[rootElement] as object), [entry]: block },
          }) as Config
      );

      // Selecting alone only highlights the tab; the form opens on `editing`.
      setExpandedRootElements((previous) => new Set(previous).add(rootElement));
      setSelectedRootElement(rootElement);
      setSelectedEntry(entry);
      setEditing(true);
      setIsEditingKey(false);
      setNewKey('');
    },
    [schema, allEntries, setConfig, setExpandedRootElements]
  );

  const selectedSchema = schema.properties[selectedRootElement];
  const previousCampaignId = usePrevious(campaignId);
  const isCampaignIdChanged = previousCampaignId !== campaignId;

  const clearDiffState = useSetAtom(clearDiffStateAtom);
  const clearScanValueSelection = useSetAtom(clearScanValueSelectionAtom);
  const previousSchemaName = usePrevious(schemaName);

  const setDiffBarData = useSetAtom(diffBarDataAtom);
  const setShowRestore = useSetAtom(showRestoreAtom);
  const setBreadcrumbEntities = useSetAtom(workflowBreadcrumbEntitiesAtom);

  useEffect(() => {
    // reset the global sidebar expansion/highlight state back to its idle default ("Info")
    clearDiffState();
    // guard the no-remount case (shared configure route, schema unchanged between workflows)
    if (previousSchemaName !== undefined && previousSchemaName !== schemaName) {
      setTab(defaultTab);
      setSelectedRootElement(firstRoot ?? '');
      // Selections live in module state that outlives the route and are keyed
      // by block name, which repeats across workflows. Drop them so the next
      // workflow starts on each sweep's first value.
      clearScanValueSelection();
    }
  }, [
    schemaName,
    clearDiffState,
    clearScanValueSelection,
    previousSchemaName,
    defaultTab,
    firstRoot,
  ]);

  useEffect(
    () => () => {
      setDiffBarData(null);
      setShowRestore(false);
    },
    [setDiffBarData, setShowRestore]
  );

  // The breadcrumb's entities are module state that outlives the route. Clearing in a
  // cleanup keyed on `schemaName` fires on unmount *and* on a workflow switch, and — unlike
  // an effect body — runs before the next workflow's model selectors publish their own.
  // biome-ignore lint/correctness/useExhaustiveDependencies: `schemaName` is the key, not a read — it is what makes the cleanup fire on a workflow switch
  useEffect(() => () => setBreadcrumbEntities([]), [schemaName, setBreadcrumbEntities]);

  useAgentState(
    aiEnabled
      ? getConfigKeyForEntity(entityType, activity, entity as { scale?: string } | undefined)
      : '',
    config
  );
  useAIConfig();

  const results = match(activity)
    .with(ScanConfigActivity.Simulate, () => (
      <Suspense>
        <SimulationsTab
          campaignId={campaignId}
          virtualLabId={virtualLabId}
          projectId={projectId}
          campaignOriginAction={campaignOriginAction}
          isCampaignIdChanged={isCampaignIdChanged}
          taskTypeBindings={taskTypeBindings}
        />
      </Suspense>
    ))
    .with(ScanConfigActivity.Extract, () =>
      taskTypeBindings ? (
        <Suspense>
          <ExtractionTab
            isCampaignIdChanged={isCampaignIdChanged}
            campaignOriginAction={campaignOriginAction}
            campaignId={campaignId}
            taskTypeBindings={taskTypeBindings}
          />
        </Suspense>
      ) : null
    )
    .with(ScanConfigActivity.Process, () =>
      taskTypeBindings ? (
        <Suspense>
          <SkeletonizationTab
            campaignId={campaignId}
            virtualLabId={virtualLabId}
            projectId={projectId}
            campaignOriginAction={campaignOriginAction}
            isCampaignIdChanged={isCampaignIdChanged}
            taskTypeBindings={taskTypeBindings}
          />
        </Suspense>
      ) : null
    )
    .with(ScanConfigActivity.Build, () =>
      taskTypeBindings ? (
        <Suspense>
          <BuildTab
            isCampaignIdChanged={isCampaignIdChanged}
            campaignOriginAction={campaignOriginAction}
            campaignId={campaignId}
            taskTypeBindings={taskTypeBindings}
          />
        </Suspense>
      ) : null
    )
    .otherwise(() => {
      throw new Error(`${activity} is not supported yet`);
    });

  const configurationContent = (
    <div id="template-content" className="flex min-h-0 flex-1 flex-col px-2 pt-6 pb-2">
      {browseOverlay ? (
        <div
          id="scan-config-model-selection-overlay"
          // the picker replaces the whole main area — fade + slight rise on open
          // so it reads as a panel arriving, not a hard cut. entry-only (no JS);
          // reduced motion keeps the fade, drops the movement
          className={cn(
            'min-h-0 flex-1',
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
          'grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,2fr)] gap-[5px] min-h-0 flex-1 overflow-hidden *:min-w-0',
          { hidden: Boolean(browseOverlay) }
        )}
      >
        <Left
          schema={schema}
          selectedRootElement={selectedRootElement}
          setSelectedRootElement={setSelectedRootElement}
          config={config}
          setConfig={setConfig}
          campaignId={campaignId}
          loading={loading}
          selectedEntry={selectedEntry}
          setSelectedEntry={setSelectedEntry}
          setEditing={setEditing}
          readOnly={readOnly}
          setCampaignId={setCampaignId}
          setLoading={setLoading}
          initialConfig={initialConfig}
          setTab={setTab}
          allEntries={allEntries}
          newKey={newKey}
          setNewKey={setNewKey}
          isEditingKey={isEditingKey}
          setIsEditingKey={setIsEditingKey}
          activity={activity}
          generatedEndpoint={generatedEndpoint}
          entityType={entityType}
          campaignEntityType={campaignEntityType}
          aiEnabled={aiEnabled}
        />
        <div
          id="scan-config-controls-middle"
          className={cn(
            styles.scrollable,
            'h-full min-w-0 overflow-x-hidden overflow-y-auto secondary-scrollbar border-r border-l border-gray-200 px-3'
          )}
        >
          {editing && selectedSchema !== undefined && (
            <Middle
              key={`${schemaName}_${selectedRootElement}_${selectedEntry}`}
              schema={schema}
              selectedRootElement={selectedRootElement}
              editing={editing}
              selectedEntry={selectedEntry}
              setSelectedEntry={setSelectedEntry}
              campaignId={campaignId}
              loading={loading}
              config={config}
              setConfig={setConfig}
              entity={entity}
              allEntries={allEntries}
              onNewBlockClick={() => {
                setNewKey('');
                setIsEditingKey(false);
              }}
              selectedSchema={selectedSchema}
              schemaMappingConfig={schemaMappingConfig}
              entityType={entityType}
            />
          )}
        </div>
        <div className="h-full min-h-0 min-w-0 overflow-hidden">
          <Right
            activity={activity}
            entityType={entityType}
            entity={entity}
            selectedEntry={selectedEntry}
            selectedRootElement={selectedRootElement}
            onCreateEntry={createEntry}
            config={config}
            setConfig={setConfig}
            schema={schema}
            locked={editingLocked}
          />
        </div>
      </div>
    </div>
  );

  const resultsContent = (
    <div
      id="scan-config-results"
      className="grid w-full grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,2fr)] gap-[5px] min-h-0 flex-1 overflow-hidden px-2 pt-6 pb-2"
    >
      {results}
    </div>
  );

  return (
    <div className={cn('flex h-full min-h-0 flex-col', className)}>
      <ScanConfigTabsPanel
        className="min-h-0 flex-1"
        activity={activity}
        tab={tab}
        setTab={setTab}
        disableResultsTab={!campaignId || loading}
        disableConfigurationTab={Boolean(!initialConfig && readOnly)}
        configuration={configurationContent}
        results={resultsContent}
        railCenter={
          <ScanConfigWorkflowSummary
            action={
              campaignId ? (
                <ButtonCopyId
                  iconOnly
                  label={get(messages, `${activity}.CopyCampaignId`)}
                  tooltip={get(messages, `${activity}.CopyCampaignId`)}
                  value={campaignId}
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

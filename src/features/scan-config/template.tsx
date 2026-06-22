'use client';

import { get } from 'es-toolkit/compat';
import { Suspense, useState } from 'react';
import { match } from 'ts-pattern';

import {
  ScanConfigMainOverlayProvider,
  useScanConfigMainOverlayOptional,
} from '@/features/scan-config/bridge/main-overlay-context';
import { useEntries } from '@/features/scan-config/components/hooks';
import { useConfig } from '@/features/scan-config/components/hooks/schema';
import TabsSelector from '@/features/scan-config/components/tabs-selector';
import { Left, Middle, Right } from '@/features/scan-config/components/ui-columns';
import {
  getConfigKeyForEntity,
  ScanConfigCampaignOriginActionDict,
  type TScanConfigCampaignOriginActionDict,
} from '@/features/scan-config/helpers';
import {
  type Config,
  type ConfigSchema,
  isType,
  ScanConfigActivity,
  ScanConfigDefaultTab,
  ScanConfigTabs,
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
import { usePrevious } from '@/hooks/hooks';
import { messages } from '@/i18n/en/scan-config';
import { useAgentState, useAIConfig } from '@/services/ai-agent';
import { ButtonCopyId } from '@/ui/molecules/button-copy-id';
import { cn } from '@/utils/css-class';

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

  const selectedSchema = schema.properties[selectedRootElement];
  const previousCampaignId = usePrevious(campaignId);
  const isCampaignIdChanged = previousCampaignId !== campaignId;

  useAgentState(
    aiEnabled
      ? getConfigKeyForEntity(entityType, activity, entity as { scale?: string } | undefined)
      : '',
    config
  );
  useAIConfig();

  const configurationTabId = ScanConfigTabs[activity].configuration;
  const isConfigurationTab = tab.id === configurationTabId;
  const results = match(activity)
    .with(ScanConfigActivity.Simulate, () => (
      <Suspense>
        <SimulationsTab
          campaignId={campaignId}
          virtualLabId={virtualLabId}
          projectId={projectId}
          campaignOriginAction={campaignOriginAction}
          isCampaignIdChanged={isCampaignIdChanged}
        />
      </Suspense>
    ))
    .with(ScanConfigActivity.Extract, () => (
      <Suspense>
        <ExtractionTab
          isCampaignIdChanged={isCampaignIdChanged}
          campaignOriginAction={campaignOriginAction}
          campaignId={campaignId}
        />
      </Suspense>
    ))
    .with(ScanConfigActivity.Process, () => (
      <Suspense>
        <SkeletonizationTab
          campaignId={campaignId}
          virtualLabId={virtualLabId}
          projectId={projectId}
        />
      </Suspense>
    ))
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

  return (
    <div className={cn('flex h-full flex-col', className)}>
      <header
        id="template-header"
        className={cn('flex flex-nowrap justify-between items-center gap-4 pt-4 pb-2')}
      >
        <TabsSelector
          activity={activity}
          tab={tab}
          setTab={setTab}
          disableResultsTab={!campaignId || loading}
          disableConfigurationTab={Boolean(!initialConfig && readOnly)}
        />
        <div className="flex items-center justify-center gap-8">
          {!!campaignId && (
            <ButtonCopyId label={get(messages, `${activity}.CopyCampaignId`)} value={campaignId} />
          )}
        </div>
      </header>

      <div id="template-separator" className="w-full h-px bg-gray-200 my-2 px-3" />
      <div id="template-content" className="flex-1 min-h-0">
        {isConfigurationTab && browseOverlay ? (
          <div id="scan-config-model-selection-overlay" className="h-[calc(100%-0.5rem)] min-h-0">
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
              'grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,2fr)] gap-[5px] h-full overflow-hidden *:min-w-0':
                isConfigurationTab && !browseOverlay,
            },
            { hidden: !isConfigurationTab || Boolean(browseOverlay) }
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
                schemaName={schemaName}
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
          <div className="h-full min-w-0 overflow-auto secondary-scrollbar">
            <Right
              activity={activity}
              entityType={entityType}
              entity={entity}
              selectedEntry={selectedEntry}
              selectedRootElement={selectedRootElement}
              config={config}
            />
          </div>
        </div>
        <div
          id="scan-config-results"
          className={cn(
            'w-full grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,2fr)] gap-[5px] h-full overflow-hidden',
            { hidden: isConfigurationTab },
            { 'h-full': !isConfigurationTab }
          )}
        >
          {results}
        </div>
      </div>
    </div>
  );
}

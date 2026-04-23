'use client';

import { get } from 'es-toolkit/compat';
import { useAtom } from 'jotai';
import { Suspense, useState } from 'react';
import { match } from 'ts-pattern';

import { useEntries } from '@/features/scan-config/components/hooks';
import { useConfigAtom } from '@/features/scan-config/components/hooks/config-atom';
import {
  type TSchemaMappingConfiguration,
  useAtomsMap,
} from '@/features/scan-config/components/hooks/schema';
import TabsSelector from '@/features/scan-config/components/tabs-selector';
import { Left, Middle, Right } from '@/features/scan-config/components/ui-columns';
import {
  ACTIVITY_AI_CONFIG_MAP,
  type TScanConfigCampaignOriginActionDict,
} from '@/features/scan-config/helpers';
import {
  type ConfigSchema,
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
import { useAgentState } from '@/services/ai-agent';
import { editingAtom, selectedEntryAtom, selectedRootElementAtom } from '@/state/config-highlights';
import { ButtonCopyId } from '@/ui/molecules/button-copy-id';
import { cn } from '@/utils/css-class';

import type { Config } from '@/features/scan-config/components/components';
import type { Nullish } from '@/utils/type';

import styles from '@/features/scan-config/scan-config.module.css';

type Props = {
  entity: TSupportedEntitiesForScanConfiguration | Nullish;
  virtualLabId: string;
  projectId: string;
  initialCampaignId?: string;
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
};

export function ScanConfigTemplate({
  entity,
  virtualLabId,
  projectId,
  initialCampaignId,
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
}: Props) {
  const [tab, setTab] = useState<TScanConfigTabs>(defaultTab);
  const [selectedRootElement, setSelectedRootElement] = useAtom(selectedRootElementAtom);
  const [editing, setEditing] = useAtom(editingAtom);
  const [selectedEntry, setSelectedEntry] = useAtom(selectedEntryAtom);
  const [loading, setLoading] = useState(false);
  const [campaignId, setCampaignId] = useState(initialCampaignId ?? '');
  const [isEditingKey, setIsEditingKey] = useState(false);
  const [newKey, setNewKey] = useState('');
  const allEntries = useEntries({ initialConfig, schema });
  const [atomsMap, setAtomsMap] = useAtomsMap({
    schema,
    initialConfig,
    model: entity,
  });
  const config = useConfigAtom(schema, atomsMap);
  const previousCampaignId = usePrevious(campaignId);
  const isCampaignIdChanged = previousCampaignId !== campaignId;

  useAgentState(aiEnabled ? ACTIVITY_AI_CONFIG_MAP[activity] : '', config);

  const results = match(activity)
    .with(ScanConfigActivity.Simulate, () => (
      <Suspense>
        <SimulationsTab campaignId={campaignId} virtualLabId={virtualLabId} projectId={projectId} />
      </Suspense>
    ))
    .with(ScanConfigActivity.Extract, () => (
      <Suspense>
        <ExtractionTab campaignId={campaignId} virtualLabId={virtualLabId} projectId={projectId} />
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
    .with(ScanConfigActivity.Build, () => (
      <Suspense>
        <BuildTab
          isCampaignIdChanged={isCampaignIdChanged}
          campaignOriginAction={campaignOriginAction}
          campaignId={campaignId}
          virtualLabId={virtualLabId}
          projectId={projectId}
        />
      </Suspense>
    ))
    .otherwise(() => {
      throw new Error(`${activity} is not supported yet`);
    });

  const configurationTabId = ScanConfigTabs[activity].configuration;

  const isConfigurationTab = tab.id === configurationTabId;

  return (
    <div className={cn('flex h-full flex-col', className)}>
      <header className={styles.header}>
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

      <div className="w-full border-t border-gray-200 my-5" />
      <div className="flex-1 min-h-0">
        <div
          id="scan-config-content-columns"
          className={cn(
            {
              'grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,2fr)] gap-[5px] h-[calc(100%-10px)] overflow-hidden *:min-w-0':
                isConfigurationTab,
            },
            { hidden: !isConfigurationTab }
          )}
        >
          <Left
            schema={schema}
            atomsMap={atomsMap}
            setAtomsMap={setAtomsMap}
            selectedRootElement={selectedRootElement}
            setSelectedRootElement={setSelectedRootElement}
            config={config}
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
          />
          <div
            id="scan-config-controls-middle"
            className={cn(
              styles.scrollable,
              'h-full min-w-0 overflow-x-hidden overflow-y-auto secondary-scrollbar border-r border-l border-gray-200 px-3'
            )}
          >
            {editing && (
              <Middle
                key={selectedRootElement + selectedEntry}
                schemaName={schemaName}
                schema={schema}
                selectedRootElement={selectedRootElement}
                editing={editing}
                atomsMap={atomsMap}
                setAtomsMap={setAtomsMap}
                selectedEntry={selectedEntry}
                setSelectedEntry={setSelectedEntry}
                campaignId={campaignId}
                loading={loading}
                config={config}
                entity={entity}
                allEntries={allEntries}
                onNewBlockClick={() => {
                  setNewKey('');
                  setIsEditingKey(false);
                }}
                selectedSchema={schema.properties[selectedRootElement]}
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
            'w-full grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,2fr)] gap-[5px] h-[calc(100%-10px)] overflow-hidden',
            { hidden: isConfigurationTab },
            { 'h-[calc(100%-10px)]': !isConfigurationTab }
          )}
        >
          {results}
        </div>
      </div>
    </div>
  );
}

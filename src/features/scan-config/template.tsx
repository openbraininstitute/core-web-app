'use client';

import { get } from 'es-toolkit/compat';
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
import { ACTIVITY_AI_CONFIG_MAP } from '@/features/scan-config/helpers';
import {
  type ConfigSchema,
  ExtractScanConfigTabs,
  ProcessScanConfigTabs,
  ScanConfigActivity,
  ScanConfigDefaultTab,
  ScanConfigTabs,
  type SchemaName,
  SimulateScanConfigTabs,
  type TScanConfigActivity,
  type TScanConfigTabs,
  type TSupportedEntitiesForScanConfiguration,
  type TSupportedEntityTypesForScanConfiguration,
} from '@/features/scan-config/types';
import { ExtractionTab } from '@/features/scan-config/use-cases/extraction/results';
import SimulationsTab from '@/features/scan-config/use-cases/simulations/results';
import { messages } from '@/i18n/en/scan-config';
import { useAgentState } from '@/services/ai-agent';
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
}: Props) {
  const [tab, setTab] = useState<TScanConfigTabs>(defaultTab);
  const [selectedRootElement, setSelectedRootElement] = useState<string>('info');
  const [editing, setEditing] = useState(true);
  const [selectedEntry, setSelectedEntry] = useState('');
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

  useAgentState(aiEnabled ? ACTIVITY_AI_CONFIG_MAP[activity] : '', config);

  const results = match({ activity, tab })
    .with({ tab: { id: SimulateScanConfigTabs.configuration } }, () => null)
    .with(
      {
        activity: ScanConfigActivity.Simulate,
        tab: { id: SimulateScanConfigTabs.simulations },
      },
      () => (
        <Suspense>
          <SimulationsTab
            campaignId={campaignId}
            virtualLabId={virtualLabId}
            projectId={projectId}
          />
        </Suspense>
      )
    )
    .with(
      {
        activity: ScanConfigActivity.Extract,
        tab: { id: ExtractScanConfigTabs.extractions },
      },
      () => (
        <Suspense>
          <ExtractionTab
            campaignId={campaignId}
            virtualLabId={virtualLabId}
            projectId={projectId}
          />
        </Suspense>
      )
    )
    .with(
      { activity: ScanConfigActivity.Process, tab: { id: ProcessScanConfigTabs.skeletonizations } },
      () => (
        <Suspense>
          <h1>Hooray!</h1>
          {/* <ExtractionTab
            campaignId={campaignId}
            virtualLabId={virtualLabId}
            projectId={projectId}
          /> */}
        </Suspense>
      )
    )
    .otherwise(() => {
      throw new Error(`${activity} is not supported yet,`);
    });

  return (
    <div className={cn('flex h-full flex-col space-y-5', className)}>
      <header className={styles.header}>
        <TabsSelector
          activity={activity}
          tab={tab}
          setTab={setTab}
          disableResultsTab={!campaignId || loading}
        />
        <div className="flex items-center justify-center gap-8">
          {!!campaignId && (
            <ButtonCopyId label={get(messages, `${activity}.CopyCampaignId`)} value={campaignId} />
          )}
        </div>
      </header>
      <div className="relative mb-5">
        <div className="w-full border-t border-gray-200" />
      </div>

      {tab.id === ScanConfigTabs[activity].configuration && (
        <div className={styles.threeColumns}>
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
            className={cn(
              styles.scrollable,
              'h-full overflow-y-auto secondary-scrollbar border-r border-l border-gray-200 px-3'
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

          <Right
            activity={activity}
            entityType={entityType}
            entity={entity}
            selectedEntry={selectedEntry}
            selectedRootElement={selectedRootElement}
            config={config}
          />
        </div>
      )}

      {results}
    </div>
  );
}

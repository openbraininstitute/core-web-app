'use client';

import { LoadingOutlined } from '@ant-design/icons';
import { get } from 'es-toolkit/compat';
import { Suspense, useState } from 'react';
import { match } from 'ts-pattern';

import { useEntries, useSchemaName } from '@/features/scan-config/components/hooks';
import { useConfigAtom } from '@/features/scan-config/components/hooks/config-atom';
import {
  resetConfig,
  useAtomsMap,
  useObioneJsonSchema,
  useSchemaMappingConfiguration,
} from '@/features/scan-config/components/hooks/schema';
import ModelPreview from '@/features/scan-config/components/model-preview';
import TabsSelector from '@/features/scan-config/components/tabs-selector';
import Left from '@/features/scan-config/components/ui-columns/left';
import Middle from '@/features/scan-config/components/ui-columns/middle';
import {
  ExtractScanConfigTabs,
  ScanConfigActivity,
  ScanConfigDefaultTab,
  ScanConfigTabs,
  SimulateScanConfigTabs,
  type TScanConfigActivity,
  type TScanConfigTabs,
} from '@/features/scan-config/types';
import { ExtractionTab } from '@/features/scan-config/use-cases/extraction/results';
import SimulationsTab from '@/features/scan-config/use-cases/simulations/results';
import { messages } from '@/i18n/en/scan-config';
import { useAgentState, useAIConfig } from '@/services/ai-agent';
import { ButtonCopyId } from '@/ui/molecules/button-copy-id';
import { cn } from '@/utils/css-class';

import type { IMEModel } from '@/api/entitycore/types';
import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { Config } from '@/features/scan-config/components/components';

import styles from '@/features/scan-config/scan-config.module.css';

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
}: {
  entity: ICircuit | IMEModel;
  virtualLabId: string;
  projectId: string;
  initialCampaignId?: string;
  initialConfig?: Config;
  defaultTab?: TScanConfigTabs;
  readOnly?: boolean;
  className?: string;
  activity: TScanConfigActivity;
}) {
  const [tab, setTab] = useState<TScanConfigTabs>(defaultTab);
  const [selectedRootElement, setSelectedRootElement] = useState<string>('info');
  const [editing, setEditing] = useState(true);
  const [selectedEntry, setSelectedEntry] = useState('');
  const [loading, setLoading] = useState(false);
  const [campaignId, setCampaignId] = useState(initialCampaignId ?? '');

  const [isEditingKey, setIsEditingKey] = useState(false);
  const [newKey, setNewKey] = useState('');

  const schemaName = useSchemaName({ model: entity, activity });
  const schema = useObioneJsonSchema(schemaName);

  const { data: schemaMappingConfig, isLoading } = useSchemaMappingConfiguration({
    schema,
    circuitId: entity.id,
    workspace: { virtualLabId, projectId },
    endpointType: 'Circuit',
  });

  const allEntries = useEntries({ initialConfig, schema });
  const [atomsMap, setAtomsMap] = useAtomsMap({ schema, initialConfig, model: entity });

  const config = useConfigAtom(schema, atomsMap);

  const aiEnabled = 'scale' in entity && entity.scale !== 'single';

  const updateRequestId = useAgentState(aiEnabled ? 'smc_simulation_config' : '', config);
  const { aiConfig, setAiConfig } = useAIConfig();

  if (!schema || Object.keys(atomsMap).length === 0 || isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <LoadingOutlined />
      </div>
    );
  }

  const results = match({ activity, tab })
    .with({ tab: { id: SimulateScanConfigTabs.configuration } }, () => null)
    .with(
      { activity: ScanConfigActivity.Simulate, tab: { id: SimulateScanConfigTabs.simulations } },
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
      { activity: ScanConfigActivity.Extract, tab: { id: ExtractScanConfigTabs.extractions } },
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
      <div className="relative mb-10">
        <div className="w-full border-t border-gray-200" />
        {/* <div className="text-primary-8 absolute -top-5 left-1/2 rounded-full bg-gray-50 p-2 px-3 shadow-sm">
          <UpOutlined onClick={() => router.back()} />
        </div> */}
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
            model={entity}
            initialConfig={initialConfig}
            setTab={setTab}
            allEntries={allEntries}
            newKey={newKey}
            setNewKey={setNewKey}
            isEditingKey={isEditingKey}
            setIsEditingKey={setIsEditingKey}
            activity={activity}
            handleAcceptAIChanges={() => {
              if (!aiConfig) return;
              resetConfig(schema, aiConfig, setAtomsMap);
              setAiConfig(null);
              updateRequestId();
            }}
            handleRejectAIChanges={() => {
              setAiConfig(null);
              updateRequestId();
            }}
          />
          <div
            className={cn(
              styles.scrollable,
              'h-full overflow-y-auto secondary-scrollbar border-r border-l border-gray-200 px-5'
            )}
          >
            {editing && (
              <Middle
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
                model={entity}
                allEntries={allEntries}
                onNewBlockClick={() => {
                  setNewKey('');
                  setIsEditingKey(false);
                }}
                selectedSchema={schema.properties[selectedRootElement]}
                schemaMappingConfig={schemaMappingConfig}
              />
            )}
          </div>

          <div className="rounded-lg">
            <ModelPreview model={entity} />
          </div>
        </div>
      )}

      {results}
    </div>
  );
}

'use client';

import { LoadingOutlined } from '@ant-design/icons';
import { Suspense, useState } from 'react';
import type { Config } from '@/features/scan-config/components/components';
import { useConfigAtom } from '@/features/scan-config/components/hooks/config-atom';
import {
  resetConfig,
  useAtomsMap,
  useObioneJsonSchema,
} from '@/features/scan-config/components/hooks/schema';
import ModelPreview from '@/features/scan-config/components/model-preview';
import TabsSelector from '@/features/scan-config/components/tabs-selector';
import styles from '@/features/scan-config/scan-config.module.css';
import type { TabType } from '@/features/scan-config/types';
import { useAgentState, useAIConfig } from '@/services/ai-agent';
import { ButtonCopyId } from '@/ui/molecules/button-copy-id';
import { cn } from '@/utils/css-class';
import { useEntries, useModel, useSchemaName } from './components/hooks';
import Left from './components/left';
import Middle from './components/middle';
import SimulationsTab from './components/simulations';

export default function ScanConfiguration({
  modelId,
  virtualLabId,
  projectId,
  initialCampaignId,
  initialConfig,
  defaultTab = 'configuration',
  readOnly,
  className,
}: {
  modelId: string;
  virtualLabId: string;
  projectId: string;
  initialCampaignId?: string;
  initialConfig?: Config;
  defaultTab?: TabType;
  readOnly?: boolean;
  className?: string;
}) {
  const [tab, setTab] = useState<TabType>(defaultTab);
  const [selectedRootElement, setSelectedRootElement] = useState<string>('info');
  const [editing, setEditing] = useState(true);
  const [selectedEntry, setSelectedEntry] = useState('');
  const [loading, setLoading] = useState(false);
  const [campaignId, setCampaignId] = useState(initialCampaignId ?? '');

  const [isEditingKey, setIsEditingKey] = useState(false);
  const [newKey, setNewKey] = useState('');

  const { model } = useModel({ id: modelId, context: { virtualLabId, projectId } });

  const schemaName = useSchemaName({ model });
  const schema = useObioneJsonSchema(schemaName);

  const allEntries = useEntries({ initialConfig, schema });

  const [atomsMap, setAtomsMap] = useAtomsMap({ schema, initialConfig, model });

  const config = useConfigAtom(schema, atomsMap);

  const updateAiRequestId = useAgentState('smc_simulation_config', config);
  const { aiConfig, setAiConfig } = useAIConfig();

  if (!schema || Object.keys(atomsMap).length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <LoadingOutlined />
      </div>
    );
  }

  return (
    <div className={cn('flex h-full flex-col space-y-5', className)}>
      <header className={styles.header}>
        <TabsSelector tab={tab} setTab={setTab} disableSimulationTab={!campaignId || loading} />
        <div className="flex items-center justify-center gap-8">
          {!!campaignId && <ButtonCopyId label="Copy simulation campaign ID" value={campaignId} />}
        </div>
      </header>
      <div className="relative mb-10">
        <div className="w-full border-t border-gray-200" />
      </div>

      {tab === 'configuration' && (
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
            model={model}
            initialConfig={initialConfig}
            setTab={setTab}
            allEntries={allEntries}
            newKey={newKey}
            setNewKey={setNewKey}
            isEditingKey={isEditingKey}
            setIsEditingKey={setIsEditingKey}
            handleAcceptAIChanges={() => {
              if (!aiConfig) return;
              resetConfig(schema, aiConfig, setAtomsMap);
              setAiConfig(null);
              updateAiRequestId();
            }}
          />

          <div
            className={cn(
              styles.scrollable,
              'h-full overflow-y-auto border-r border-l border-gray-200 px-5'
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
                model={model}
                allEntries={allEntries}
                onNewBlockClick={() => {
                  setNewKey('');
                  setIsEditingKey(false);
                }}
                selectedSchema={schema.properties[selectedRootElement]}
              />
            )}
          </div>

          <div className="rounded-lg">
            <ModelPreview model={model} />
          </div>
        </div>
      )}

      {tab === 'simulations' && (
        <Suspense>
          <SimulationsTab
            campaignId={campaignId}
            virtualLabId={virtualLabId}
            projectId={projectId}
          />
        </Suspense>
      )}
    </div>
  );
}

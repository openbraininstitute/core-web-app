'use client';

// import { LoadingOutlined, UpOutlined } from '@ant-design/icons';
import { LoadingOutlined } from '@ant-design/icons';
import { Suspense, useState } from 'react';
import SimulationsTab from './components/simulations';

// import { useRouter } from 'next/navigation';

import type { Config } from '@/features/scan-config/components/components';
import { useConfigAtom } from '@/features/scan-config/components/hooks/config-atom';
import { useAtomsMap, useObioneJsonSchema } from '@/features/scan-config/components/hooks/schema';
import ModelPreview from '@/features/scan-config/components/model-preview';
import TabsSelector from '@/features/scan-config/components/tabs-selector';
import styles from '@/features/scan-config/scan-config.module.css';
import type { Block, TabType } from '@/features/scan-config/types';
import { ButtonCopyId } from '@/ui/molecules/button-copy-id';
import { cn } from '@/utils/css-class';
import { useEntries, useModel, useSchemaName } from './components/hooks';
import Left from './components/left';
import Middle from './components/middle';

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
  //  const router = useRouter();
  const [tab, setTab] = useState<TabType>(defaultTab);
  const [selectedRootElement, setSelectedRootElement] = useState<string>('info');
  const [editing, setEditing] = useState(true);
  const [selectedBlock, setSelectedBlock] = useState('');
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
        {/* <div className="text-primary-8 absolute -top-5 left-1/2 rounded-full bg-gray-50 p-2 px-3 shadow-sm">
          <UpOutlined onClick={() => router.back()} />
        </div> */}
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
            setSelectedBlock={setSelectedBlock}
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
                selectedBlock={selectedBlock}
                editing={editing}
                atomsMap={atomsMap}
                setAtomsMap={setAtomsMap}
                setSelectedBlock={setSelectedBlock}
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

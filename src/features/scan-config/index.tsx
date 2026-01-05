'use client';

// import { LoadingOutlined, UpOutlined } from '@ant-design/icons';
import { LoadingOutlined } from '@ant-design/icons';
import { Suspense, useState } from 'react';
// import { useRouter } from 'next/navigation';

import { useEntries, useModel } from './_components/hooks';
import Left from './_components/left';
import Middle from './_components/middle';
import SimulationsTab from './_components/simulations';

import { useAppNotification } from '@/components/notification';
import { Config } from '@/features/scan-config/_components/components';
import { useConfigAtom } from '@/features/scan-config/_components/hooks/config-atom';
import { useObioneJsonSchema } from '@/features/scan-config/_components/hooks/schema';
import ModelPreview from '@/features/scan-config/_components/model-preview';
import TabsSelector from '@/features/scan-config/_components/tabs-selector';
import { AtomsMap, TabType, Block } from '@/features/scan-config/types';
import { ButtonCopyId } from '@/ui/molecules/button-copy-id';
import { cn } from '@/utils/css-class';

import styles from '@/features/scan-config/scan-config.module.css';

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
  const notification = useAppNotification();
  const [campaignId, setCampaignId] = useState(initialCampaignId ?? '');

  const [isEditingKey, setIsEditingKey] = useState(false);
  const [newKey, setNewKey] = useState('');

  const [atomsMap, setAtomsMap] = useState<AtomsMap>({});
  const { model } = useModel({ id: modelId, context: { virtualLabId, projectId } });
  const schema = useObioneJsonSchema(model, notification, setAtomsMap, initialConfig);

  const selectedBlockSchema: Block | undefined =
    schema?.properties?.[selectedRootElement]?.ui_element === 'block_dictionary'
      ? schema.properties[selectedRootElement].additionalProperties.oneOf.find(
          (o: Block) => o.properties?.type.const === selectedBlock
        )
      : undefined;

  const allEntries = useEntries({ initialConfig, schema });

  const handleAddReferenceClick = (referenceTab: string) => {
    setSelectedRootElement(referenceTab);
    setEditing(true);
    setSelectedBlock('');
  };
  const config = useConfigAtom(schema, atomsMap);

  if (!schema) {
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
            virtualLabId={virtualLabId}
            projectId={projectId}
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
            setSelectedCategory={setSelectedBlock}
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

          <Middle
            schema={schema}
            configTab={selectedRootElement}
            selectedCategory={selectedBlock}
            editing={editing}
            atomsMap={atomsMap}
            setAtomsMap={setAtomsMap}
            setSelectedCategory={setSelectedBlock}
            selectedEntry={selectedEntry}
            setSelectedEntry={setSelectedEntry}
            handleAddReferenceClick={handleAddReferenceClick}
            campaignId={campaignId}
            loading={loading}
            config={config}
            selectedBlockSchema={selectedBlockSchema}
            model={model}
            virtualLabId={virtualLabId}
            projectId={projectId}
            allEntries={allEntries}
            onNewBlockClick={() => {
              setNewKey('');
              setIsEditingKey(false);
            }}
          />

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

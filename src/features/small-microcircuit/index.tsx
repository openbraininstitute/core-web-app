'use client';

import { LoadingOutlined, UpOutlined } from '@ant-design/icons';
import { Suspense, useState } from 'react';
import { useRouter } from 'next/navigation';
import SimulationsTab from './_components/simulations';
import Left from './_components/left';
import { useEntries, useModel } from './_components/hooks';

import Middle from './_components/middle';
import { useAppNotification } from '@/components/notification';
import { Config } from '@/features/small-microcircuit/_components/components';
import { useConfigAtom } from '@/features/small-microcircuit/_components/hooks/config-atom';
import { useObioneJsonSchema } from '@/features/small-microcircuit/_components/hooks/schema';
import ModelPreview from '@/features/small-microcircuit/_components/model-preview';
import TabsSelector from '@/features/small-microcircuit/_components/tabs-selector';
import { AtomsMap, TabType } from '@/features/small-microcircuit/types';
import { ButtonCopyId } from '@/ui/molecules/button-copy-id';
import { cn } from '@/utils/css-class';
import styles from '@/features/small-microcircuit/small-microcircuit.module.css';

export default function SimulationCampaignConfiguration({
  modelId,
  virtualLabId,
  projectId,
  initialCampaignId,
  initialConfig,
  readOnly,
  className,
}: {
  modelId: string;
  virtualLabId: string;
  projectId: string;
  initialCampaignId?: string;
  initialConfig?: Config;
  readOnly?: boolean;
  className?: string;
}) {
  const router = useRouter();

  const [tab, setTab] = useState<TabType>('configuration');
  const [configTab, setConfigTab] = useState<string>('info');
  const [editing, setEditing] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedEntry, setSelectedEntry] = useState('');
  const [loading, setLoading] = useState(false);
  const notification = useAppNotification();
  const [campaignId, setCampaignId] = useState(initialCampaignId ?? '');

  const [atomsMap, setAtomsMap] = useState<AtomsMap>({});
  const { model } = useModel({ id: modelId, context: { virtualLabId, projectId } });
  const { schema, refLabels, referenceTypesToConfigKeys, referenceTypesToTitles } =
    useObioneJsonSchema(model, notification, setAtomsMap, initialConfig);

  const selectedCatSchema = schema?.properties?.[configTab]?.additionalProperties?.oneOf?.find(
    (s) => s.properties?.type.const === selectedCategory
  );

  const allEntries = useEntries({ initialConfig, schema });

  const handleAddReferenceClick = (referenceTab: string) => {
    setConfigTab(referenceTab);
    setEditing(true);
    setSelectedCategory('');
  };
  const config = useConfigAtom(schema, atomsMap);

  if (!schema || !refLabels || !referenceTypesToConfigKeys || !referenceTypesToTitles) {
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
        <div className="text-primary-8 absolute -top-5 left-1/2 rounded-full bg-gray-50 p-2 px-3 shadow-sm">
          <UpOutlined onClick={() => router.back()} />
        </div>
      </div>

      {tab === 'configuration' && (
        <div className={styles.threeColumns}>
          <Left
            virtualLabId={virtualLabId}
            projectId={projectId}
            schema={schema}
            atomsMap={atomsMap}
            setAtomsMap={setAtomsMap}
            configTab={configTab}
            setConfigTab={setConfigTab}
            config={config}
            campaignId={campaignId}
            loading={loading}
            selectedEntry={selectedEntry}
            setSelectedEntry={setSelectedEntry}
            setEditing={setEditing}
            setSelectedCategory={setSelectedCategory}
            readOnly={readOnly}
            setCampaignId={setCampaignId}
            setLoading={setLoading}
            model={model}
            initialConfig={initialConfig}
            setTab={setTab}
            allEntries={allEntries}
          />

          <Middle
            schema={schema}
            configTab={configTab}
            selectedCategory={selectedCategory}
            editing={editing}
            atomsMap={atomsMap}
            setAtomsMap={setAtomsMap}
            setSelectedCategory={setSelectedCategory}
            selectedEntry={selectedEntry}
            setSelectedEntry={setSelectedEntry}
            referenceTypesToConfigKeys={referenceTypesToConfigKeys}
            referenceTypesToTitles={referenceTypesToTitles}
            refLabels={refLabels}
            handleAddReferenceClick={handleAddReferenceClick}
            campaignId={campaignId}
            loading={loading}
            config={config}
            selectedCatSchema={selectedCatSchema}
            model={model}
            virtualLabId={virtualLabId}
            projectId={projectId}
            allEntries={allEntries}
          />

          <div className="overflow-hidden rounded-lg">
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

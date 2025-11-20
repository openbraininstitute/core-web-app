'use client';

import { LoadingOutlined, UpOutlined } from '@ant-design/icons';
import { atom } from 'jotai';
import { Fragment, Suspense, useState } from 'react';
import { useRouter } from 'next/navigation';
import SimulationsTab from './_components/simulations';
import Left from './_components/left';
import { useModel } from './_components/hooks';

import { useAppNotification } from '@/components/notification';
import {
  Config,
  ConfigValue,
  JSONSchemaForm,
} from '@/features/small-microcircuit/_components/components';
import { useConfigAtom } from '@/features/small-microcircuit/_components/hooks/config-atom';
import {
  isRootCategory,
  resolveKey,
  useObioneJsonSchema,
} from '@/features/small-microcircuit/_components/hooks/schema';
import ModelPreview from '@/features/small-microcircuit/_components/model-preview';
import TabsSelector from '@/features/small-microcircuit/_components/tabs-selector';
import { isAtom } from '@/features/small-microcircuit/_components/utils';
import { AtomsMap, TabType } from '@/features/small-microcircuit/types';
import { ButtonCopyId } from '@/ui/molecules/button-copy-id';
import { classNames } from '@/util/utils';
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
  const [selectedItemIdx, setSelectedItemIdx] = useState<number | null>(null);
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
            selectedItemIdx={selectedItemIdx}
            setSelectedItemIdx={setSelectedItemIdx}
            setEditing={setEditing}
            setSelectedCategory={setSelectedCategory}
            readOnly={readOnly}
            setCampaignId={setCampaignId}
            setLoading={setLoading}
            model={model}
            initialConfig={initialConfig}
            setTab={setTab}
          />

          <div
            className={classNames(
              styles.scrollable,
              'h-full overflow-y-auto border-r border-l border-gray-200 px-5'
            )}
          >
            {schema.properties &&
              schema.properties?.[configTab]?.additionalProperties?.oneOf &&
              !selectedCategory &&
              editing && (
                <div className="flex flex-col items-center gap-5">
                  {schema.properties[configTab].additionalProperties.oneOf.map((o) => {
                    return (
                      <Fragment key={o.title}>
                        {/* eslint-disable-next-line */}
                        <div
                          className="min-h-[100px] w-full cursor-pointer rounded-xl border border-gray-200 p-5 hover:bg-white"
                          onClick={() => {
                            if (isRootCategory(schema, configTab)) return;

                            setSelectedCategory(o.properties?.type.const ?? '');
                            const initial: Record<string, ConfigValue> = {};
                            if (o.properties)
                              Object.entries(o.properties).forEach(([subkey, subValue]) => {
                                if (subkey === 'type') initial[subkey] = subValue.const ?? null;
                                else initial[subkey] = subValue.default ?? null;
                              });
                            const itemIndexes = Object.keys(atomsMap[configTab]).map((subkey) =>
                              parseInt(subkey.split('_')[1], 10)
                            );
                            itemIndexes.sort((a, b) => a - b);
                            const itemIdx = (itemIndexes.at(-1) ?? -1) + 1;
                            setSelectedItemIdx(itemIdx);
                            setAtomsMap({
                              ...atomsMap,
                              [configTab]: {
                                ...atomsMap[configTab],
                                [resolveKey(schema, configTab, itemIdx)]:
                                  atom<Record<string, ConfigValue>>(initial),
                              },
                            });
                          }}
                        >
                          <div className="text-primary-9 text-lg font-bold">{o.title}</div>
                          <div className="mt-3">{o.description}</div>
                        </div>
                      </Fragment>
                    );
                  })}
                </div>
              )}

            {schema.properties &&
              schema.properties?.[configTab] &&
              editing &&
              (isRootCategory(schema, configTab) || selectedCatSchema) && (
                <JSONSchemaForm
                  referenceTypesToConfigKeys={referenceTypesToConfigKeys}
                  referenceTypesToTitles={referenceTypesToTitles}
                  refLabels={refLabels}
                  key={
                    isRootCategory(schema, configTab)
                      ? configTab
                      : resolveKey(schema, configTab, selectedItemIdx)
                  }
                  selectedCategory={selectedCategory}
                  onAddReferenceClick={handleAddReferenceClick}
                  disabled={!!campaignId || loading}
                  config={config}
                  schema={selectedCatSchema ?? schema.properties[configTab]}
                  stateAtom={
                    isAtom(atomsMap[configTab])
                      ? atomsMap[configTab]
                      : atomsMap[configTab][resolveKey(schema, configTab, selectedItemIdx)]
                  }
                  model={model}
                  virtualLabId={virtualLabId}
                  projectId={projectId}
                />
              )}
          </div>
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

import { Fragment } from 'react';

import { RootElement } from '@/features/scan-config/components/root-element';
import {
  type AtomsMap,
  type ConfigSchema,
  isType,
  type TScanConfigActivity,
  type TScanConfigTabs,
} from '@/features/scan-config/types';
import { useAIConfig } from '@/services/ai-agent';

import GenerateConfigButton from '../generate-config-button';
import { useValidateSchema } from '../hooks';

import type { IMEModel } from '@/api/entitycore/types';
import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { Config } from '@/features/scan-config/components/components';

import styles from '@/features/scan-config/scan-config.module.css';

export default function Left({
  schema,
  atomsMap,
  setAtomsMap,
  selectedRootElement,
  setSelectedRootElement,
  config,
  campaignId,
  loading,
  selectedEntry,
  setSelectedEntry,
  setEditing,
  readOnly,
  setCampaignId,
  setLoading,
  model,
  initialConfig,
  setTab,
  allEntries,
  newKey,
  setNewKey,
  isEditingKey,
  setIsEditingKey,
  activity,
  handleAcceptAIChanges,
  handleRejectAIChanges,
}: {
  schema: ConfigSchema;
  atomsMap: AtomsMap;
  setAtomsMap: React.Dispatch<React.SetStateAction<AtomsMap>>;
  selectedRootElement: string;
  setSelectedRootElement: (rootElement: string) => void;
  config: Config;
  campaignId: string;
  loading: boolean;
  selectedEntry: string;
  setSelectedEntry: (selectedEntry: string) => void;
  setEditing: React.Dispatch<React.SetStateAction<boolean>>;
  readOnly?: boolean;
  setCampaignId: React.Dispatch<React.SetStateAction<string>>;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setTab: React.Dispatch<React.SetStateAction<TScanConfigTabs>>;
  model: ICircuit | IMEModel;
  initialConfig?: Config;
  allEntries: Set<string>;
  newKey: string;
  setNewKey: (k: string) => void;
  isEditingKey: boolean;
  setIsEditingKey: (k: boolean) => void;
  activity: TScanConfigActivity;
  handleAcceptAIChanges: () => void;
  handleRejectAIChanges: () => void;
}) {
  const errors = useValidateSchema({ initialConfig, config, schema });
  const { aiConfig } = useAIConfig();

  return (
    <div className={styles.scrollable}>
      <div className="flex grow flex-col items-center gap-5 overflow-y-auto overflow-x-hidden secondary-scrollbar px-2 pb-5">
        {schema.group_order.map((group) => {
          return (
            <Fragment key={group}>
              <div className="self-start text-gray-500 uppercase">{group}</div>
              {schema.properties &&
                Object.entries(schema.properties)
                  .filter(
                    ([_, rootElementSchema]) =>
                      'group' in rootElementSchema && rootElementSchema.group === group
                  )
                  .sort(([_, a], [__, b]) => {
                    if (isType(a) || isType(b)) return 0;
                    return a.group_order - b.group_order;
                  })
                  .map(([k, rootElementSchema]) => {
                    if (isType(rootElementSchema)) return null;
                    return (
                      <RootElement
                        key={k}
                        rootElement={k}
                        schema={schema}
                        rootElementSchema={rootElementSchema}
                        atomsMap={atomsMap}
                        setAtomsMap={setAtomsMap}
                        selectedRootElement={selectedRootElement}
                        setSelectedRootElement={setSelectedRootElement}
                        config={config}
                        campaignId={campaignId}
                        loading={loading}
                        errors={errors}
                        selectedEntry={selectedEntry}
                        setSelectedEntry={setSelectedEntry}
                        setEditing={setEditing}
                        readOnly={readOnly}
                        allEntries={allEntries}
                        newKey={newKey}
                        setNewKey={setNewKey}
                        isEditingKey={isEditingKey}
                        setIsEditingKey={setIsEditingKey}
                      />
                    );
                  })}
            </Fragment>
          );
        })}
      </div>

      {!!aiConfig && !campaignId && (
        <div className="flex w-[95%] min-h-12.5 gap-2">
          <button
            type="button"
            className="min-h-12.5 text-lg drop-shadow border-red-500 border rounded-full p-2 grow text-red-500"
            onClick={handleRejectAIChanges}
          >
            Reject changes
          </button>
          <button
            type="button"
            className="min-h-12.5 text-lg bg-green-600 text-white p-2 rounded-full grow "
            onClick={handleAcceptAIChanges}
          >
            Accept changes
          </button>
        </div>
      )}

      {!readOnly && (!aiConfig || (aiConfig && campaignId)) && (
        <GenerateConfigButton
          loading={loading}
          campaignId={campaignId}
          setCampaignId={setCampaignId}
          errors={errors}
          config={config}
          model={model}
          setTab={setTab}
          setLoading={setLoading}
          activity={activity}
        />
      )}
    </div>
  );
}

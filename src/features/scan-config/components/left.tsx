import { Fragment } from 'react';
import type { IMEModel } from '@/api/entitycore/types';
import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import { RootElement } from '@/features/scan-config/components/root-element';
import styles from '@/features/scan-config/scan-config.module.css';
import {
  type AtomsMap,
  type ConfigSchema,
  isType,
  type TScanConfigActivity,
  type TScanConfigTabs,
} from '@/features/scan-config/types';
import type { Config } from './components';
import GenerateConfigButton from './generate-config-button';
import { useValidateSchema } from './hooks';

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
}) {
  const errors = useValidateSchema({ initialConfig, config, schema });

  return (
    <div className={styles.scrollable}>
      <div className="flex grow flex-col items-center gap-5 overflow-y-auto pr-5 pb-5">
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

      {!readOnly && (
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

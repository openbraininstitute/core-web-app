import { Fragment } from 'react';
import { Config } from './components';
import { useValidateSchema } from './hooks';
import GenerateConfigButton from './generate-config-button';
import { RootElement } from '@/features/scan-config/_components/root-element';
import { AtomsMap, ConfigSchema, isType, TabType } from '@/features/scan-config/types';
import { ICircuit } from '@/api/entitycore/types/entities/circuit';
import { IMEModel } from '@/api/entitycore/types';

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
  setSelectedBlock,
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
  setSelectedBlock: React.Dispatch<React.SetStateAction<string>>;
  readOnly?: boolean;
  setCampaignId: React.Dispatch<React.SetStateAction<string>>;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setTab: React.Dispatch<React.SetStateAction<TabType>>;
  model: ICircuit | IMEModel;
  initialConfig?: Config;
  allEntries: Set<string>;
  newKey: string;
  setNewKey: (k: string) => void;
  isEditingKey: boolean;
  setIsEditingKey: (k: boolean) => void;
}) {
  const errors = useValidateSchema({ initialConfig, config, schema });

  return (
    <div className={styles.scrollable}>
      <div className="flex flex-grow flex-col items-center gap-5 overflow-y-auto pr-5 pb-5">
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
                        setSelectedBlock={setSelectedBlock}
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
        />
      )}
    </div>
  );
}

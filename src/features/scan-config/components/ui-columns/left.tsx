import { useEffect } from 'react';

import { RootElement } from '@/features/scan-config/components/root-element';
import {
  type AtomsMap,
  type ConfigSchema,
  isType,
  ScanConfigUIElementDict,
  type TScanConfigActivity,
  type TScanConfigTabs,
  type TSupportedEntityTypesForScanConfiguration,
} from '@/features/scan-config/types';
import { useAIConfig } from '@/services/ai-agent';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/molecules/tooltip';

import GenerateConfigButton from '../generate-config-button';
import { useValidateSchema } from '../hooks';
import { resetConfig } from '../hooks/schema';

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
  initialConfig,
  setTab,
  allEntries,
  newKey,
  setNewKey,
  isEditingKey,
  setIsEditingKey,
  activity,
  generatedEndpoint,
  entityType,
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
  initialConfig?: Config;
  allEntries: Set<string>;
  newKey: string;
  setNewKey: (k: string) => void;
  isEditingKey: boolean;
  setIsEditingKey: (k: boolean) => void;
  activity: TScanConfigActivity;
  generatedEndpoint: string;
  entityType: TSupportedEntityTypesForScanConfiguration;
}) {
  const errors = useValidateSchema({ initialConfig, config, schema });
  const { aiConfig, setAiConfig } = useAIConfig();

  // Auto-apply AI-generated configuration changes when available
  useEffect(() => {
    if (aiConfig && !campaignId) {
      resetConfig(schema, aiConfig, setAtomsMap);
      setAiConfig(null);
    }
  }, [aiConfig, campaignId, schema, setAtomsMap, setAiConfig]);

  return (
    <div className={styles.scrollable}>
      <div className="flex grow flex-col items-center gap-5 overflow-y-auto overflow-x-hidden secondary-scrollbar px-2 pb-5">
        {schema.group_order.map((group) => {
          return (
            <div key={group} className="w-full flex flex-col gap-1.5">
              <h4 className="self-start text-gray-500 uppercase">{group}</h4>
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
            </div>
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
          setTab={setTab}
          setLoading={setLoading}
          activity={activity}
          entityType={entityType}
          generatedApiUrl={generatedEndpoint}
        />
      )}
    </div>
  );
}

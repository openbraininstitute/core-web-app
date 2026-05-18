import { useAtom } from 'jotai';
import { useEffect } from 'react';

import { RootElement } from '@/features/scan-config/components/root-element';
import { useConfigUpdateFlashes } from '@/features/scan-config/hooks/use-config-update-flashes';
import {
  type ConfigSchema,
  isType,
  type TScanConfigActivity,
  type TScanConfigTabs,
  type TSupportedEntityTypesForScanConfiguration,
} from '@/features/scan-config/types';
import { useAIConfig } from '@/services/ai-agent';
import { pendingRestoreConfigAtom, restorePreviewActiveAtom } from '@/state/config-highlights';

import GenerateConfigButton from '../generate-config-button';
import { useValidateSchema } from '../hooks';

import type { Config } from '@/features/scan-config/types';

export default function Left({
  schema,
  selectedRootElement,
  setSelectedRootElement,
  config,
  setConfig,
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
  selectedRootElement: string;
  setSelectedRootElement: (rootElement: string) => void;
  config: Config;
  setConfig: (newConfig: Config) => void;
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
  const [pendingRestoreConfig, setPendingRestoreConfig] = useAtom(pendingRestoreConfigAtom);
  const [restorePreviewActive] = useAtom(restorePreviewActiveAtom);

  // Compute flash animations from config updates (replaces per-RootElement CustomEvent listeners)
  useConfigUpdateFlashes();

  // Auto-apply AI-generated configuration changes when available
  // Skip when a restore preview is active — the config overlay is for display only.
  useEffect(() => {
    if (restorePreviewActive) return;
    if (aiConfig && !campaignId) {
      setConfig(aiConfig);
      setAiConfig({});
    }
  }, [aiConfig, campaignId, setConfig, setAiConfig, restorePreviewActive]);

  // Apply confirmed restore config to live atoms
  useEffect(() => {
    if (pendingRestoreConfig) {
      setConfig(pendingRestoreConfig);
      setPendingRestoreConfig(null);
    }
  }, [pendingRestoreConfig, setConfig, setPendingRestoreConfig]);

  return (
    <div id="scan-config-controls-left" className="flex h-full min-h-0 flex-col">
      <div className="secondary-scrollbar flex min-h-0 flex-1 flex-col items-center gap-5 overflow-y-auto overflow-x-hidden px-2 pb-5">
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
                        selectedRootElement={selectedRootElement}
                        setSelectedRootElement={setSelectedRootElement}
                        config={config}
                        setConfig={setConfig}
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
        <div className="mt-auto w-full pr-4 pt-2">
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
        </div>
      )}
    </div>
  );
}

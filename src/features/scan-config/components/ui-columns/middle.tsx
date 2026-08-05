import Block from '@/features/scan-config/components/ui-blocks/block';
import BlockDictionary from '@/features/scan-config/components/ui-blocks/block-dictionary';
import BlockUnion from '@/features/scan-config/components/ui-blocks/block-union';
import { resolveScanConfigEditingLocked } from '@/features/scan-config/hooks/use-config-editing-locked';
import { useDiffPreview } from '@/features/scan-config/hooks/use-diff-preview-atom';
import { useShowingDiffs } from '@/features/scan-config/hooks/use-showing-diffs';
import {
  type Config,
  type ConfigSchema,
  type IBlockDictionary,
  type IBlockSingle,
  type IRootBlockUnion,
  ScanConfigUIElementDict,
  type TSupportedEntitiesForScanConfiguration,
  type TSupportedEntityTypesForScanConfiguration,
} from '@/features/scan-config/types';
import { useAIConfig } from '@/services/ai-agent';
import { cn } from '@/utils/css-class';

import { isPlainObject } from '../utils';

import type { TSchemaMappingConfiguration } from '@/features/scan-config/components/hooks/schema';
import type { Nullish } from '@/utils/type';

import styles from '@/features/scan-config/scan-config.module.css';

type MiddleProps = {
  schema: ConfigSchema;
  selectedRootElement: string;
  editing: boolean;
  selectedEntry: string;
  setSelectedEntry: (entry: string) => void;
  campaignId: string;
  loading: boolean;
  config: Config;
  setConfig: (newConfig: Config) => void;
  entity: TSupportedEntitiesForScanConfiguration | Nullish;
  entityType: TSupportedEntityTypesForScanConfiguration;
  allEntries: Set<string>;
  onNewBlockClick?: () => void;
  selectedSchema: IBlockSingle | IBlockDictionary | IRootBlockUnion;
  schemaMappingConfig: TSchemaMappingConfiguration | undefined;
};

export default function Middle({
  schema,
  selectedRootElement,
  selectedEntry,
  setSelectedEntry,
  campaignId,
  loading,
  config,
  setConfig,
  entity,
  allEntries,
  onNewBlockClick,
  selectedSchema,
  schemaMappingConfig,
  entityType,
}: MiddleProps) {
  const { aiConfig, isChatReady } = useAIConfig();
  const showingDiffs = useShowingDiffs();
  const preview = useDiffPreview(selectedRootElement);

  // for BlockDictionary the path includes the entry; for others just the root element
  const errorPathPrefix =
    selectedSchema.ui_element === ScanConfigUIElementDict.BlockDictionary
      ? `${selectedRootElement}/${selectedEntry}`
      : selectedRootElement;

  return (
    <div
      className={cn(styles.animateFadeUp, 'w-full min-w-0 max-w-full')}
      id="scan-config-middle-content"
    >
      {selectedSchema.ui_element === ScanConfigUIElementDict.BlockDictionary && (
        <BlockDictionary
          campaignId={campaignId}
          loading={loading}
          config={config}
          setConfig={setConfig}
          entity={entity}
          allEntries={allEntries}
          schema={schema}
          selectedEntry={selectedEntry}
          setSelectedEntry={setSelectedEntry}
          blockDictionarySchema={selectedSchema}
          selectedRootElement={selectedRootElement}
          onNewBlockClick={onNewBlockClick}
          schemaMappingConfig={schemaMappingConfig}
          errorPathPrefix={errorPathPrefix}
        />
      )}

      {selectedSchema.ui_element === ScanConfigUIElementDict.BlockSingle &&
        isPlainObject(config[selectedRootElement]) && (
          <Block
            schema={schema}
            disabled={resolveScanConfigEditingLocked({
              campaignId,
              loading,
              aiConfig,
              isChatReady,
              showingDiffs,
            })}
            config={config}
            blockSchema={selectedSchema}
            state={preview ?? config[selectedRootElement] ?? {}}
            setState={(newState) => {
              setConfig({ ...config, [selectedRootElement]: newState });
            }}
            entity={entity}
            schemaMappingConfig={schemaMappingConfig}
            rootElement={selectedRootElement}
            selectedEntry={selectedEntry}
            errorPathPrefix={errorPathPrefix}
          />
        )}

      {selectedSchema.ui_element === ScanConfigUIElementDict.BlockUnion && (
        <BlockUnion
          schema={schema}
          blockUnionSchema={selectedSchema}
          selectedRootElement={selectedRootElement}
          campaignId={campaignId}
          loading={loading}
          config={config}
          setConfig={setConfig}
          entity={entity}
          entityType={entityType}
          schemaMappingConfig={schemaMappingConfig}
          errorPathPrefix={errorPathPrefix}
        />
      )}
    </div>
  );
}

import Block from '@/features/scan-config/components/ui-blocks/block';
import BlockDictionary from '@/features/scan-config/components/ui-blocks/block-dictionary';
import BlockUnion from '@/features/scan-config/components/ui-blocks/block-union';
import { isAtom } from '@/features/scan-config/components/utils';
import { useDiffPreviewAtom } from '@/features/scan-config/hooks/use-diff-preview-atom';
import { useShowingDiffs } from '@/features/scan-config/hooks/use-showing-diffs';
import {
  type AtomsMap,
  type Config,
  type ConfigSchema,
  type IBlockDictionary,
  type IBlockSingle,
  type IRootBlockUnion,
  ScanConfigUIElementDict,
  type SchemaName,
  type TSupportedEntitiesForScanConfiguration,
  type TSupportedEntityTypesForScanConfiguration,
} from '@/features/scan-config/types';
import { useAIConfig } from '@/services/ai-agent';

import type { TSchemaMappingConfiguration } from '@/features/scan-config/components/hooks/schema';
import type { Nullish } from '@/utils/type';

import styles from '@/features/scan-config/scan-config.module.css';

type MiddleProps = {
  schemaName: SchemaName;
  schema: ConfigSchema;
  selectedRootElement: string;
  editing: boolean;
  atomsMap: AtomsMap;
  setAtomsMap: (v: AtomsMap) => void;
  selectedEntry: string;
  setSelectedEntry: (entry: string) => void;
  campaignId: string;
  loading: boolean;
  config: Config;
  entity: TSupportedEntitiesForScanConfiguration | Nullish;
  entityType: TSupportedEntityTypesForScanConfiguration;
  allEntries: Set<string>;
  onNewBlockClick?: () => void;
  selectedSchema: IBlockSingle | IBlockDictionary | IRootBlockUnion;
  schemaMappingConfig: TSchemaMappingConfiguration | undefined;
};

export default function Middle({
  schemaName,
  schema,
  selectedRootElement,
  atomsMap,
  setAtomsMap,
  selectedEntry,
  setSelectedEntry,
  campaignId,
  loading,
  config,
  entity,
  allEntries,
  onNewBlockClick,
  selectedSchema,
  schemaMappingConfig,
  entityType,
}: MiddleProps) {
  const { aiConfig, isChatReady } = useAIConfig();
  const showingDiffs = useShowingDiffs();
  const previewAtom = useDiffPreviewAtom(selectedRootElement);

  // for BlockDictionary the path includes the entry; for others just the root element
  const errorPathPrefix =
    selectedSchema.ui_element === ScanConfigUIElementDict.BlockDictionary
      ? `${selectedRootElement}/${selectedEntry}`
      : selectedRootElement;

  return (
    <div className={styles.animateFadeUp}>
      {selectedSchema.ui_element === ScanConfigUIElementDict.BlockDictionary && (
        <BlockDictionary
          campaignId={campaignId}
          loading={loading}
          config={config}
          entity={entity}
          allEntries={allEntries}
          schema={schema}
          atomsMap={atomsMap}
          setAtomsMap={setAtomsMap}
          selectedEntry={selectedEntry}
          setSelectedEntry={setSelectedEntry}
          schemaName={schemaName}
          blockDictionarySchema={selectedSchema}
          selectedRootElement={selectedRootElement}
          onNewBlockClick={onNewBlockClick}
          schemaMappingConfig={schemaMappingConfig}
          errorPathPrefix={errorPathPrefix}
        />
      )}

      {selectedSchema.ui_element === ScanConfigUIElementDict.BlockSingle &&
        isAtom(atomsMap[selectedRootElement]) && (
          <Block
            schema={schema}
            schemaName={schemaName}
            disabled={!!campaignId || loading || !!aiConfig || !isChatReady || showingDiffs}
            config={config}
            blockSchema={selectedSchema}
            stateAtom={previewAtom ?? atomsMap[selectedRootElement]}
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
          schemaName={schemaName}
          blockUnionSchema={selectedSchema}
          selectedRootElement={selectedRootElement}
          atomsMap={atomsMap}
          setAtomsMap={setAtomsMap}
          campaignId={campaignId}
          loading={loading}
          config={config}
          entity={entity}
          entityType={entityType}
          schemaMappingConfig={schemaMappingConfig}
          errorPathPrefix={errorPathPrefix}
        />
      )}
    </div>
  );
}

import BlockDictionary from '@/features/scan-config/components/block-dictionary';
import BlockUnion from '@/features/scan-config/components/block-union';
import { BlockUI, type Config } from '@/features/scan-config/components/components';
import { isRootBlock } from '@/features/scan-config/components/hooks/schema';
import { isAtom, isPlainObject } from '@/features/scan-config/components/utils';
import {
  type AtomsMap,
  type ConfigSchema,
  type IBlockDictionary,
  type IBlockSingle,
  type IRootBlockUnion,
  ScanConfigUIElementDict,
  type SchemaName,
} from '@/features/scan-config/types';
import { useAIConfig } from '@/services/ai-agent';

import type { IMEModel } from '@/api/entitycore/types';
import type { ICircuit } from '@/api/entitycore/types/entities/circuit';

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
  model: ICircuit | IMEModel;
  allEntries: Set<string>;
  onNewBlockClick?: () => void;
  selectedSchema: IBlockSingle | IBlockDictionary | IRootBlockUnion;
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
  model,
  allEntries,
  onNewBlockClick,
  selectedSchema,
}: MiddleProps) {
  const { aiConfig, isChatReady } = useAIConfig();

  const getBlockAIConfig = () => {
    if (!aiConfig) return null;

    const blockConf = aiConfig[selectedRootElement];
    if (!isPlainObject(blockConf)) return {};
    if (isRootBlock(schema, selectedRootElement)) return blockConf;
    return blockConf[selectedEntry] ?? {};
  };

  return (
    <>
      {selectedSchema.ui_element === ScanConfigUIElementDict.BlockDictionary && (
        <BlockDictionary
          campaignId={campaignId}
          loading={loading}
          config={config}
          model={model}
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
          blockAIConfig={getBlockAIConfig()}
        />
      )}

      {selectedSchema.ui_element === ScanConfigUIElementDict.BlockSingle &&
        isAtom(atomsMap[selectedRootElement]) && (
          <BlockUI
            schemaName={schemaName}
            disabled={!!campaignId || loading || !!aiConfig || !isChatReady}
            config={config}
            blockSchema={selectedSchema}
            stateAtom={atomsMap[selectedRootElement]}
            model={model}
            blockAIConfig={getBlockAIConfig()}
          />
        )}

      {selectedSchema.ui_element === ScanConfigUIElementDict.BlockUnion && (
        <BlockUnion
          schemaName={schemaName}
          blockUnionSchema={selectedSchema}
          selectedRootElement={selectedRootElement}
          atomsMap={atomsMap}
          setAtomsMap={setAtomsMap}
          campaignId={campaignId}
          loading={loading}
          config={config}
          model={model}
          // blockAIConfig={getBlockAIConfig()}
        />
      )}
    </>
  );
}

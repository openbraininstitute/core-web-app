import Block from '@/features/scan-config/components/block';
import BlockDictionary from '@/features/scan-config/components/block-dictionary';
import BlockUnion from '@/features/scan-config/components/block-union';
import { isAtom } from '@/features/scan-config/components/utils';
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
import type { Config } from '@/features/scan-config/components/components';
import type { TSchemaMappingConfiguration } from '@/features/scan-config/components/hooks/schema';

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
  model,
  allEntries,
  onNewBlockClick,
  selectedSchema,
  schemaMappingConfig,
}: MiddleProps) {
  const { aiConfig, isChatReady } = useAIConfig();

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
          schemaMappingConfig={schemaMappingConfig}
        />
      )}

      {selectedSchema.ui_element === ScanConfigUIElementDict.BlockSingle &&
        isAtom(atomsMap[selectedRootElement]) && (
          <Block
            schemaName={schemaName}
            disabled={!!campaignId || loading || !!aiConfig || !isChatReady}
            config={config}
            blockSchema={selectedSchema}
            stateAtom={atomsMap[selectedRootElement]}
            model={model}
            schemaMappingConfig={schemaMappingConfig}
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
          schemaMappingConfig={schemaMappingConfig}
        />
      )}
    </>
  );
}

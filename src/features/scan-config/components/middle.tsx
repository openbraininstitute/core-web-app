import type { IMEModel } from '@/api/entitycore/types';
import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import { BlockUI, type Config } from '@/features/scan-config/components/components';
import { isAtom } from '@/features/scan-config/components/utils';
import {
  type AtomsMap,
  type ConfigSchema,
  type IBlockDictionary,
  type IBlockSingle,
  type IRootBlock,
  ScanConfigUIElementDict,
  type SchemaName,
} from '@/features/scan-config/types';
import BlockDictionary from './block-dictionary';

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
  selectedSchema: IRootBlock | IBlockDictionary | IBlockSingle;
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
        />
      )}

      {selectedSchema.ui_element === ScanConfigUIElementDict.RootBlock &&
        isAtom(atomsMap[selectedRootElement]) && (
          <BlockUI
            schemaName={schemaName}
            disabled={!!campaignId || loading}
            config={config}
            blockSchema={selectedSchema}
            stateAtom={atomsMap[selectedRootElement]}
            model={model}
          />
        )}
    </>
  );
}

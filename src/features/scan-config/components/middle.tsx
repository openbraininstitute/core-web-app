import type { IMEModel } from '@/api/entitycore/types';
import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import { BlockUI, type Config } from '@/features/scan-config/components/components';
import { isAtom } from '@/features/scan-config/components/utils';
import styles from '@/features/scan-config/scan-config.module.css';
import type {
  AtomsMap,
  BlockDictionary as BlockDictionaryT,
  ConfigSchema,
  RootBlock,
  SchemaName,
} from '@/features/scan-config/types';
import { classNames } from '@/util/utils';
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
  selectedSchema: RootBlock | BlockDictionaryT;
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
      {selectedSchema.ui_element === 'block_dictionary' && (
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

      {selectedSchema.ui_element === 'root_block' && isAtom(atomsMap[selectedRootElement]) && (
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

import { CheckCircleFilled, WarningFilled } from '@ant-design/icons';
import type { ErrorObject } from 'ajv';
import type React from 'react';
import { useAIConfig } from '@/services/ai-agent';
import type { AtomsMap, BlockDictionary, ConfigSchema, RootBlock } from '../types';
import BlockDictionaryEntries from './block-dictionary-entries';
import { Chevron, type Config, Tab } from './components';
import { isRootBlock } from './hooks/schema';

export function RootElement({
  schema,
  rootElement,
  rootElementSchema,
  atomsMap,
  setAtomsMap,
  selectedRootElement,
  setSelectedRootElement,
  config,
  campaignId,
  loading,
  errors,
  selectedEntry,
  setSelectedEntry,
  setEditing,
  readOnly,
  allEntries,
  newKey,
  setNewKey,
  isEditingKey,
  setIsEditingKey,
}: {
  schema: ConfigSchema | null; // The global schema
  rootElement: string;
  rootElementSchema: RootBlock | BlockDictionary;
  atomsMap: AtomsMap;
  setAtomsMap: React.Dispatch<React.SetStateAction<AtomsMap>>;
  selectedRootElement: string;
  setSelectedRootElement: (configTab: string) => void;
  config: Config;
  campaignId: string;
  loading: boolean;
  errors: ErrorObject<string, Record<string, any>, unknown>[] | null | undefined;
  selectedEntry: string;
  setSelectedEntry: (selectedEntry: string) => void;
  setEditing: React.Dispatch<React.SetStateAction<boolean>>;
  readOnly?: boolean;
  allEntries: Set<string>;
  newKey: string;
  setNewKey: (k: string) => void;
  isEditingKey: boolean;
  setIsEditingKey: (k: boolean) => void;
}) {
  const { aiConfig, isChatReady } = useAIConfig();
  if (!schema || !schema?.properties) return;

  const handleEntryClick = (subkey: string) => {
    setSelectedEntry(subkey);
    setEditing(true);
    setIsEditingKey(false);
    setNewKey('');
  };

  return (
    <>
      <Tab
        tab={rootElement}
        selectedTab={selectedRootElement}
        onClick={() => {
          if (selectedRootElement === rootElement && !isRootBlock(schema, rootElement)) {
            setEditing(false);
            setSelectedEntry('');
            setSelectedRootElement('');
            return;
          }

          setSelectedRootElement(rootElement);
          setSelectedEntry('');

          if (rootElementSchema.ui_element === 'block_single') setEditing(true);
          else setEditing(false);
        }}
        extraClass="w-full flex justify-between h-[50px] min-h-[50px] items-center drop-shadow"
      >
        {schema.properties?.[rootElement]?.title}
        <div className="flex gap-1">
          {errors?.find((error) => error.instancePath.startsWith('/' + rootElement)) ? (
            <WarningFilled className="text-yellow-400" />
          ) : (
            <CheckCircleFilled className="text-green-600" />
          )}
          <Chevron rotate={rootElementSchema.ui_element === 'block_dictionary' ? 90 : 0} />
        </div>
      </Tab>

      {rootElementSchema.ui_element === 'block_dictionary' &&
        selectedRootElement === rootElement &&
        config[rootElement] && (
          <BlockDictionaryEntries
            config={config}
            aiConfig={aiConfig}
            rootElement={rootElement}
            selectedEntry={selectedEntry}
            selectedRootElement={selectedRootElement}
            handleEntryClick={handleEntryClick}
            campaignId={campaignId}
            loading={loading}
            readOnly={!!readOnly}
            isChatReady={isChatReady}
            setEditing={setEditing}
            setSelectedEntry={setSelectedEntry}
            singularName={rootElementSchema.singular_name}
            allEntries={allEntries}
            newKey={newKey}
            setNewKey={setNewKey}
            isEditingKey={isEditingKey}
            setIsEditingKey={setIsEditingKey}
            atomsMap={atomsMap}
            setAtomsMap={setAtomsMap}
            errors={errors}
          />
        )}
    </>
  );
}

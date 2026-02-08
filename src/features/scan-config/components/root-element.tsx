import { CheckCircleFilled, SwapOutlined, WarningFilled } from '@ant-design/icons';
import type { ErrorObject } from 'ajv';
import { isEqual } from 'es-toolkit/compat';
import { atom } from 'jotai';
import type React from 'react';
import BlockDictionaryEntries from '@/features/scan-config/components/block-dictionary-entries';
import {
  Chevron,
  type Config,
  type ConfigValue,
  LeftMenuTab,
} from '@/features/scan-config/components/components';
import { isRootBlock } from '@/features/scan-config/components/hooks/schema';
import { isPlainObject } from '@/features/scan-config/components/utils';

import {
  type AtomsMap,
  type ConfigSchema,
  type IBlockDictionary,
  type IBlockSingle,
  type IRootBlockUnion,
  isType,
  ScanConfigUIElementDict,
  type TBlock,
} from '@/features/scan-config/types';

import { useAIConfig } from '@/services/ai-agent';
import { classNames } from '@/util/utils';

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
  rootElementSchema: IBlockSingle | IBlockDictionary | IRootBlockUnion;
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
      <LeftMenuTab
        tab={rootElement}
        selectedTab={selectedRootElement}
        onClick={() => {
          // for block_dictionary, clicking again collapses it
          // for ScanConfigUIElementDict.BlockSingle and ScanConfigUIElementDict.BlockUnion, they stay open
          if (
            selectedRootElement === rootElement &&
            !isRootBlock(schema, rootElement) &&
            rootElementSchema.ui_element !== ScanConfigUIElementDict.BlockUnion
          ) {
            setEditing(false);
            setSelectedEntry('');
            setSelectedRootElement('');
            return;
          }

          setSelectedRootElement(rootElement);
          setSelectedEntry('');

          if (
            rootElementSchema.ui_element === ScanConfigUIElementDict.BlockSingle ||
            rootElementSchema.ui_element === ScanConfigUIElementDict.BlockUnion
          )
            setEditing(true);
          else setEditing(false);
        }}
        extraClass="w-full flex justify-between h-[50px] min-h-[50px] items-center drop-shadow"
      >
        {schema.properties?.[rootElement]?.title}
        <div className="flex gap-1">
          {errors?.find((error) => error.instancePath.startsWith(`/${rootElement}`)) ? (
            <WarningFilled className="text-yellow-400!" />
          ) : (
            <CheckCircleFilled className="text-green-600!" />
          )}

          {!!aiConfig && !isEqual(config[rootElement], aiConfig[rootElement]) && (
            <span className="text-slate-500! text-[10px] animate-pulse">✦</span>
          )}

          <Chevron
            rotate={
              rootElementSchema.ui_element === ScanConfigUIElementDict.BlockDictionary ? 90 : 0
            }
          />
        </div>
      </LeftMenuTab>

      {rootElementSchema.ui_element === ScanConfigUIElementDict.BlockDictionary &&
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

      {/* Block Union: show selected variant with change option */}
      {rootElementSchema.ui_element === ScanConfigUIElementDict.BlockUnion &&
        selectedRootElement === rootElement &&
        (() => {
          const unionSchema = rootElementSchema as IRootBlockUnion;
          const discriminatorProp = unionSchema.discriminator
            ? typeof unionSchema.discriminator === 'string'
              ? unionSchema.discriminator
              : (unionSchema.discriminator.propertyName ?? 'type')
            : 'type';

          const currentConfig = config[rootElement];
          const selectedType =
            isPlainObject(currentConfig) && typeof currentConfig[discriminatorProp] === 'string'
              ? currentConfig[discriminatorProp]
              : undefined;

          const selectedVariant: TBlock | undefined = unionSchema.oneOf.find((o: TBlock) => {
            const typeProp = o.properties?.[discriminatorProp];
            return typeProp && isType(typeProp) && typeProp.const === selectedType;
          });

          if (!selectedVariant || !selectedType) return null;

          return (
            <button
              type="button"
              className={classNames(
                'text-primary-8 flex h-12.5 min-h-12.5 w-90percent min-w-37.5 items-center',
                'justify-between rounded-full bg-gray-100 px-5 py-2 text-sm drop-shadow',
                'bg-linear-to-r from-[#003A8C] to-[#001026] text-white'
              )}
            >
              <span className="truncate">{selectedVariant.title}</span>
              {!campaignId && !loading && !readOnly && (
                <SwapOutlined
                  className="cursor-pointer transition-transform hover:scale-110"
                  onClick={(e) => {
                    e.stopPropagation();
                    setAtomsMap({
                      ...atomsMap,
                      [rootElement]: atom<Record<string, ConfigValue>>({}),
                    });
                  }}
                />
              )}
            </button>
          );
        })()}
    </>
  );
}

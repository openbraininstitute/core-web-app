import { CheckCircleFilled, WarningFilled } from '@ant-design/icons';
import { lowerCase, upperFirst } from 'es-toolkit/compat';

import BlockDictionaryEntries from '@/features/scan-config/components/block-dictionary-entries';
import { Chevron, type Config, LeftMenuTab } from '@/features/scan-config/components/components';
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

import type { ErrorObject } from 'ajv';
import type React from 'react';

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
        extraClass="w-full flex text-left justify-between min-h-[50px] items-center drop-shadow ml-0.5"
      >
        <span className="flex items-center gap-2 wrap-break-word min-w-0">
          <SelectedUnionVariantLabel
            rootElementSchema={rootElementSchema}
            config={config}
            rootElement={rootElement}
            fallbackTitle={schema.properties?.[rootElement]?.title}
          />
        </span>
        <div className="flex gap-3">
          {errors?.find((error) => error.instancePath.startsWith(`/${rootElement}`)) ? (
            <WarningFilled className="text-yellow-400!" />
          ) : (
            <CheckCircleFilled className="text-green-600!" />
          )}

          <Chevron
            rotate={
              rootElementSchema.ui_element === ScanConfigUIElementDict.BlockDictionary ? 90 : 0
            }
          />
        </div>
      </LeftMenuTab>

      {rootElementSchema.ui_element === ScanConfigUIElementDict.BlockDictionary && (
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
          visible={selectedRootElement === rootElement && !!config[rootElement]}
        />
      )}
    </>
  );
}

function SelectedUnionVariantLabel({
  rootElementSchema,
  config,
  rootElement,
  fallbackTitle,
}: {
  rootElementSchema: IBlockSingle | IBlockDictionary | IRootBlockUnion;
  config: Config;
  rootElement: string;
  fallbackTitle?: string;
}) {
  if (rootElementSchema.ui_element !== ScanConfigUIElementDict.BlockUnion)
    return upperFirst(lowerCase(fallbackTitle));

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
  const selectedVariant = selectedType
    ? unionSchema.oneOf.find((o: TBlock) => {
        const typeProp = o.properties?.[discriminatorProp];
        return typeProp && isType(typeProp) && typeProp.const === selectedType;
      })
    : undefined;

  return upperFirst(lowerCase(selectedVariant?.title ?? fallbackTitle));
}

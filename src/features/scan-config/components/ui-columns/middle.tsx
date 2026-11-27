import Block from '@/features/scan-config/components/ui-blocks/block';
import BlockDictionary from '@/features/scan-config/components/ui-blocks/block-dictionary';
import BlockUnion from '@/features/scan-config/components/ui-blocks/block-union';
import { EModelOptimisationParameters } from '@/features/scan-config/components/ui-blocks/emodel-optimisation-parameters';
import { resolveScanConfigEditingLocked } from '@/features/scan-config/hooks/use-config-editing-locked';
import { useDiffPreview } from '@/features/scan-config/hooks/use-diff-preview-atom';
import { useShowingDiffs } from '@/features/scan-config/hooks/use-showing-diffs';
import {
  type ConfigSchema,
  type IBlockDictionary,
  type IBlockSingle,
  type IEModelOptimisationParameters,
  type IRootBlockUnion,
  ScanConfigUIElementDict,
  type TSupportedEntitiesForScanConfiguration,
  type TSupportedEntityTypesForScanConfiguration,
} from '@/features/scan-config/types';
import {
  BlockScopeProvider,
  useBlockState,
  useConfigErrorsUnder,
  useHasBlock,
} from '@/features/scan-config/use-config-store';
import { useAIConfig } from '@/services/ai-agent';
import { cn } from '@/utils/css-class';

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
  entity: TSupportedEntitiesForScanConfiguration | Nullish;
  entityType: TSupportedEntityTypesForScanConfiguration;
  onNewBlockClick?: () => void;
  selectedSchema: IBlockSingle | IBlockDictionary | IRootBlockUnion | IEModelOptimisationParameters;
  schemaMappingConfig: TSchemaMappingConfiguration | undefined;
  /** selected inner mechanisms tab key when the root element is `emodel_optimisation_parameters` */
  selectedMechanismsTab: string;
  /** selected Region Assignment section-list choice (`name`), or '' when none is selected */
  selectedRegionChoice: string;
  /** sets the selected Region Assignment section-list choice */
  setSelectedRegionChoice: (choice: string) => void;
};

type TSingleBlockProps = Pick<
  MiddleProps,
  'schema' | 'selectedRootElement' | 'selectedEntry' | 'entity' | 'schemaMappingConfig'
> & {
  blockSchema: IBlockSingle;
  disabled: boolean;
};

function SingleBlock({
  schema,
  selectedRootElement,
  selectedEntry,
  entity,
  schemaMappingConfig,
  blockSchema,
  disabled,
}: TSingleBlockProps) {
  const preview = useDiffPreview(selectedRootElement);
  const hasBlock = useHasBlock(selectedRootElement);

  if (!hasBlock) return null;

  return (
    <BlockScopeProvider rootElement={selectedRootElement} preview={preview}>
      <Block
        schema={schema}
        disabled={disabled}
        blockSchema={blockSchema}
        entity={entity}
        schemaMappingConfig={schemaMappingConfig}
        rootElement={selectedRootElement}
        selectedEntry={selectedEntry}
        errorPathPrefix={selectedRootElement}
      />
    </BlockScopeProvider>
  );
}

type TEModelBlockProps = Pick<
  MiddleProps,
  | 'selectedRootElement'
  | 'selectedMechanismsTab'
  | 'selectedRegionChoice'
  | 'setSelectedRegionChoice'
> & {
  rootSchema: IEModelOptimisationParameters;
  disabled: boolean;
};

function EModelBlock({
  selectedRootElement,
  selectedMechanismsTab,
  selectedRegionChoice,
  setSelectedRegionChoice,
  rootSchema,
  disabled,
}: TEModelBlockProps) {
  const [rootState, setRootState] = useBlockState(selectedRootElement);
  const errors = useConfigErrorsUnder(`/${selectedRootElement}`);

  return (
    <EModelOptimisationParameters
      selectedTab={selectedMechanismsTab}
      rootSchema={rootSchema}
      value={rootState ?? null}
      onChange={setRootState}
      selectedRegionChoice={selectedRegionChoice}
      setSelectedRegionChoice={setSelectedRegionChoice}
      disabled={disabled}
      errors={errors}
    />
  );
}

export default function Middle({
  schema,
  selectedRootElement,
  selectedEntry,
  setSelectedEntry,
  campaignId,
  loading,
  entity,
  onNewBlockClick,
  selectedSchema,
  schemaMappingConfig,
  entityType,
  selectedMechanismsTab,
  selectedRegionChoice,
  setSelectedRegionChoice,
}: MiddleProps) {
  const { aiConfig, isChatReady } = useAIConfig();
  const showingDiffs = useShowingDiffs();

  // Same read-only/locked signal the generic Block uses, so the bespoke emodel widgets disable
  // their editable controls (pickers, checkboxes, inputs) once the campaign is generated / locked.
  const editingLocked = resolveScanConfigEditingLocked({
    campaignId,
    loading,
    aiConfig,
    isChatReady,
    showingDiffs,
  });

  return (
    <div
      className={cn(styles.animateFadeUp, 'w-full min-w-0 max-w-full')}
      id="scan-config-middle-content"
    >
      {selectedSchema.ui_element === ScanConfigUIElementDict.BlockDictionary && (
        <BlockDictionary
          campaignId={campaignId}
          loading={loading}
          entity={entity}
          schema={schema}
          selectedEntry={selectedEntry}
          setSelectedEntry={setSelectedEntry}
          blockDictionarySchema={selectedSchema}
          selectedRootElement={selectedRootElement}
          onNewBlockClick={onNewBlockClick}
          schemaMappingConfig={schemaMappingConfig}
          errorPathPrefix={`${selectedRootElement}/${selectedEntry}`}
        />
      )}

      {selectedSchema.ui_element === ScanConfigUIElementDict.BlockSingle && (
        <SingleBlock
          schema={schema}
          selectedRootElement={selectedRootElement}
          selectedEntry={selectedEntry}
          entity={entity}
          schemaMappingConfig={schemaMappingConfig}
          blockSchema={selectedSchema}
          disabled={editingLocked}
        />
      )}

      {selectedSchema.ui_element === ScanConfigUIElementDict.BlockUnion && (
        <BlockUnion
          schema={schema}
          blockUnionSchema={selectedSchema}
          selectedRootElement={selectedRootElement}
          campaignId={campaignId}
          loading={loading}
          entity={entity}
          entityType={entityType}
          schemaMappingConfig={schemaMappingConfig}
          errorPathPrefix={selectedRootElement}
        />
      )}

      {selectedSchema.ui_element === ScanConfigUIElementDict.EModelOptimisationParameters && (
        <EModelBlock
          selectedRootElement={selectedRootElement}
          selectedMechanismsTab={selectedMechanismsTab}
          selectedRegionChoice={selectedRegionChoice}
          setSelectedRegionChoice={setSelectedRegionChoice}
          rootSchema={selectedSchema}
          disabled={editingLocked}
        />
      )}
    </div>
  );
}

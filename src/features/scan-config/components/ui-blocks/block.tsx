import { RiCloseLine } from '@remixicon/react';
import { isNil } from 'es-toolkit/compat';

import { UIElementRender } from '@/features/scan-config/components/ui-elements';
import {
  SweepIconButton,
  sweepSingleValue,
} from '@/features/scan-config/components/ui-elements/parameter-sweep';
import { resolveNeuronFilterProperties } from '@/features/scan-config/helpers';
import { useBlockDiff } from '@/features/scan-config/hooks/use-block-diff';
import {
  type Config,
  type ConfigSchema,
  type ConfigValue,
  isType,
  ScanConfigUIElementDict,
  type TBlock,
  type TSupportedEntitiesForScanConfiguration,
} from '@/features/scan-config/types';
import { MarkdownDescription } from '@/ui/molecules/markdown-description';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/molecules/tooltip';
import { cn } from '@/utils/css-class';

import type { TSchemaMappingConfiguration } from '@/features/scan-config/components/hooks/schema';
import type { Nullish } from '@/utils/type';

export default function Block({
  schema,
  disabled,
  blockSchema,
  state,
  setState,
  config,
  entity,
  hideTitle,
  schemaMappingConfig,
  rootElement,
  selectedEntry,
  errorPathPrefix,
}: {
  schema: ConfigSchema;
  disabled: boolean;
  config: Config;
  blockSchema?: TBlock;
  entity: TSupportedEntitiesForScanConfiguration | Nullish;
  state: Record<string, ConfigValue>;
  setState: (newState: Record<string, ConfigValue>) => void;
  hideTitle?: boolean;
  schemaMappingConfig: TSchemaMappingConfiguration | undefined;
  rootElement?: string;
  selectedEntry?: string;
  errorPathPrefix?: string;
}) {
  const { getFieldDiffClass } = useBlockDiff(rootElement, selectedEntry);

  if (!blockSchema) return null;

  return (
    <div
      className="flex w-full min-w-0 max-w-full flex-col gap-2"
      data-scan-config-block={ScanConfigUIElementDict.BlockSingle}
    >
      {!hideTitle && (
        <>
          <div className="text-lg text-gray-500 uppercase wrap-break-word">{blockSchema.title}</div>
          <MarkdownDescription className="mb-6 text-gray-500">
            {blockSchema.description}
          </MarkdownDescription>
        </>
      )}
      {hideTitle && (
        <MarkdownDescription className="mb-6 text-gray-500">
          {blockSchema.description}
        </MarkdownDescription>
      )}

      <div className="flex flex-col gap-5">
        {blockSchema.properties &&
          Object.entries(blockSchema.properties)
            .filter(
              ([_, paramSchema]) =>
                !isType(paramSchema) &&
                !paramSchema.ui_hidden &&
                (paramSchema.ui_element !== ScanConfigUIElementDict.Reference ||
                  paramSchema.reference_types.some(
                    (refType) => !!schema.default_block_reference_labels?.[refType]
                  ))
            )
            .map(([k, blockElementSchema]) => {
              if (isType(blockElementSchema)) return null;
              const isBooleanInput =
                blockElementSchema.ui_element === ScanConfigUIElementDict.BooleanInput;
              const isPillField =
                blockElementSchema.ui_element === ScanConfigUIElementDict.ModelSelectorSingle;

              const value = state[k];
              const fieldBorderClass = getFieldDiffClass(k);
              // A sweep expanded into several values offers a way back to one
              // value. It renders on this title row rather than inside the
              // element so it sits level with the label instead of floating
              // above the values card.
              const canCollapseSweep =
                !disabled &&
                Array.isArray(value) &&
                (blockElementSchema.ui_element === ScanConfigUIElementDict.FloatParameterSweep ||
                  blockElementSchema.ui_element === ScanConfigUIElementDict.IntParameterSweep);

              return (
                <div
                  key={k}
                  className={cn(
                    'flex w-full min-w-0 max-w-full',
                    isBooleanInput ? 'flex-row items-center' : 'flex-col'
                  )}
                  data-scan-config-block-element={blockElementSchema.ui_element}
                >
                  <div className="flex gap-0.5 w-full items-center mb-2">
                    <div
                      className="text-primary-9 text-base font-semibold uppercase"
                      title={blockElementSchema.description}
                    >
                      {blockElementSchema.title}
                    </div>
                    {blockElementSchema.units && (
                      <div className="text-lg text-gray-500">{blockElementSchema.units}</div>
                    )}
                    {canCollapseSweep && (
                      <SweepIconButton
                        label="Use a single value"
                        className="ml-auto"
                        onClick={() => {
                          setState({ ...state, [k]: sweepSingleValue(value as (number | null)[]) });
                        }}
                      >
                        <RiCloseLine className="size-3.5" />
                      </SweepIconButton>
                    )}
                  </div>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="w-full min-w-0 max-w-full">
                        <div className="mb-1 w-full min-w-0 max-w-full">
                          <div
                            className={cn(
                              'w-full min-w-0 max-w-full border',
                              isPillField ? 'rounded-full' : 'rounded-lg',
                              fieldBorderClass,
                              !fieldBorderClass && 'border-transparent'
                            )}
                          >
                            <UIElementRender
                              k={k}
                              disabled={disabled}
                              paramSchema={blockElementSchema}
                              config={config}
                              schema={schema}
                              entity={entity}
                              schemaMappingConfig={schemaMappingConfig}
                              state={state}
                              setState={setState}
                              selectedEntry={selectedEntry}
                              errorPathPrefix={
                                errorPathPrefix ? `${errorPathPrefix}/${k}` : undefined
                              }
                            />
                          </div>
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent
                      avoidCollisions
                      hideWhenDetached
                      align="center"
                      side="right"
                      className={cn(
                        'text-white shadow-bnb max-w-2xs min-w-2xs rounded-md ',
                        'bg-primary-8 px-4 py-2 text-base text-wrap ',
                        'overflow-y-auto max-h-50 primary-scrollbar'
                      )}
                      arrowClassName="bg-primary-8"
                    >
                      {k === 'circuit' && entity
                        ? entity.description
                        : blockElementSchema.description}
                    </TooltipContent>
                  </Tooltip>

                  {(() => {
                    if (
                      blockElementSchema.ui_element === ScanConfigUIElementDict.NeuronPropertyFilter
                    ) {
                      const { population, properties } = resolveNeuronFilterProperties(
                        blockElementSchema,
                        state,
                        schemaMappingConfig
                      );
                      // A population is chosen but exposes no filterable properties:
                      // a data condition, not a missing input, so say so instead of "Required".
                      if (population && Object.keys(properties).length === 0) {
                        return <span className="text-red-500">No properties available</span>;
                      }
                    }

                    return (
                      blockSchema.required?.includes(k) &&
                      isNil(value) && <span className="text-red-500">Required</span>
                    );
                  })()}
                </div>
              );
            })}
      </div>
    </div>
  );
}

export { Block };

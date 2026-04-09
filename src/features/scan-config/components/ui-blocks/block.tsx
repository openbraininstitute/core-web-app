import { isNil } from 'es-toolkit/compat';
import { atom, useAtom } from 'jotai';

import { UIElementRender } from '@/features/scan-config/components/ui-elements';
import {
  type Config,
  type ConfigSchema,
  type ConfigValue,
  isType,
  ScanConfigUIElementDict,
  type SchemaName,
  type TBlock,
  type TSupportedEntitiesForScanConfiguration,
} from '@/features/scan-config/types';
import { useBlockDiff } from '@/features/scan-config/hooks/use-block-diff';
import { TextPatternTransformer, urlRegex } from '@/ui/molecules/text-pattern-transformer';
import { TransformedLink } from '@/ui/molecules/text-pattern-transformer/link-item';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/molecules/tooltip';
import { cn } from '@/utils/css-class';

import type { TSchemaMappingConfiguration } from '@/features/scan-config/components/hooks/schema';
import type { Nullish } from '@/utils/type';

export default function Block({
  schemaName,
  schema,
  disabled,
  blockSchema,
  stateAtom,
  config,
  entity,
  hideTitle,
  schemaMappingConfig,
  rootElement,
  selectedEntry,
  errorPathPrefix,
}: {
  schemaName: SchemaName;
  schema: ConfigSchema;
  disabled: boolean;
  config: Config;
  blockSchema?: TBlock;
  entity: TSupportedEntitiesForScanConfiguration | Nullish;
  stateAtom: ReturnType<typeof atom<Record<string, ConfigValue>>> | null;
  hideTitle?: boolean;
  schemaMappingConfig: TSchemaMappingConfiguration | undefined;
  rootElement?: string;
  selectedEntry?: string;
  errorPathPrefix?: string;
}) {
  const [state, setState] = useAtom(stateAtom ?? atom<Record<string, ConfigValue>>({}));
  const { getFieldDiffClass } = useBlockDiff(rootElement, selectedEntry);

  if (!blockSchema) return null;

  return (
    <div
      className="flex flex-col gap-2"
      data-scan-config-block={ScanConfigUIElementDict.BlockSingle}
    >
      {!hideTitle && (
        <>
          <div className="text-lg text-gray-500 uppercase wrap-break-word">{blockSchema.title}</div>
          <div className="mb-6 text-gray-500">
            <TextPatternTransformer
              regex={urlRegex}
              component={(match) => (
                <TransformedLink url={match} className="wrap-break-word text-primary-6" />
              )}
            >
              {blockSchema.description}
            </TextPatternTransformer>
          </div>
        </>
      )}
      {hideTitle && blockSchema.description && (
        <div className="mb-6 text-gray-500">
          <TextPatternTransformer
            regex={urlRegex}
            component={(match) => (
              <TransformedLink url={match} className="wrap-break-word text-primary-6" />
            )}
          >
            {blockSchema.description}
          </TextPatternTransformer>
        </div>
      )}

      <div className="flex flex-col gap-5">
        {blockSchema.properties &&
          Object.entries(blockSchema.properties)
            .filter(
              ([_, paramSchema]) =>
                !isType(paramSchema) &&
                !paramSchema.ui_hidden &&
                (paramSchema.ui_element !== ScanConfigUIElementDict.Reference ||
                  Boolean(schema.default_block_reference_labels?.[paramSchema.reference_type]))
            )
            .map(([k, blockElementSchema]) => {
              if (isType(blockElementSchema)) return null;
              const isBooleanInput =
                blockElementSchema.ui_element === ScanConfigUIElementDict.BooleanInput;

              const value = state[k];
              const fieldBorderClass = getFieldDiffClass(k);

              return (
                <div
                  key={k}
                  className={cn(
                    'w-full flex',
                    isBooleanInput ? 'flex-row items-center' : 'flex-col'
                  )}
                  data-scan-config-block-element={blockElementSchema.ui_element}
                >
                  <div className="flex gap-3 w-full items-center mb-2">
                    <div
                      className="text-primary-9 text-base font-semibold uppercase"
                      title={blockElementSchema.description}
                    >
                      {blockElementSchema.title}
                    </div>
                    {blockElementSchema.units && (
                      <div className="text-lg text-gray-500">{blockElementSchema.units}</div>
                    )}
                  </div>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div>
                        <div className="mb-1 flex items-center gap-1">
                          <div 
                            className={cn(
                              'border rounded-lg flex-1 mr-1',
                              fieldBorderClass,
                              !fieldBorderClass && 'border-transparent'
                            )}
                          >
                            <UIElementRender
                              k={k}
                              disabled={disabled}
                              paramSchema={blockElementSchema}
                              value={value}
                              config={config}
                              schema={schema}
                              schemaName={schemaName}
                              entity={entity}
                              schemaMappingConfig={schemaMappingConfig}
                              state={state}
                              setState={setState}
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

                  {blockSchema.required?.includes(k) && isNil(value) && (
                    <span className="text-red-500">Required</span>
                  )}
                </div>
              );
            })}
      </div>
    </div>
  );
}

export { Block };

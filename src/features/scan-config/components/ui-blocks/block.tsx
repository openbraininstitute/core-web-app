import { CloseOutlined } from '@ant-design/icons';
import { isEqual, isNil } from 'es-toolkit/compat';
import { atom, useAtom } from 'jotai';
import { useRef } from 'react';

import AIAdd from '@/components/icons/ai/add_icon';
import { UIElementRender } from '@/features/scan-config/components/ui-elements';
import {
  type Config,
  type ConfigValue,
  isType,
  ScanConfigUIElementDict,
  type SchemaName,
  type TBlock,
  type TSupportedEntitiesForScanConfiguration,
} from '@/features/scan-config/types';
import { TextPatternTransformer, urlRegex } from '@/ui/molecules/text-pattern-transformer';
import { TransformedLink } from '@/ui/molecules/text-pattern-transformer/link-item';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/molecules/tooltip';
import { cn } from '@/utils/css-class';

import type { TSchemaMappingConfiguration } from '@/features/scan-config/components/hooks/schema';
import type { Nullish } from '@/utils/type';

export default function Block({
  schemaName,
  disabled,
  blockSchema,
  stateAtom,
  config,
  entity,
  blockAIConfig,
  hideTitle,
  schemaMappingConfig,
}: {
  schemaName: SchemaName;
  disabled: boolean;
  config: Config;
  blockSchema?: TBlock;
  entity: TSupportedEntitiesForScanConfiguration | Nullish;
  stateAtom: ReturnType<typeof atom<Record<string, ConfigValue>>> | null;
  blockAIConfig: Record<string, ConfigValue> | null;
  hideTitle?: boolean;
  schemaMappingConfig: TSchemaMappingConfiguration | undefined;
}) {
  // Empty atom for when a block doesn't exist in the config (and the atoms map) yet, only in the AI suggested changes
  const emptyAtom = useRef(atom<Record<string, ConfigValue>>({}));
  const [state, setState] = useAtom(stateAtom ?? emptyAtom.current);

  if (!blockSchema) return null;

  function op(k: string) {
    if (!blockAIConfig) return null;
    const v1 = state[k];
    const v2 = blockAIConfig[k];

    if (v1 === undefined && v2 !== undefined) return 'add';
    if (v1 !== undefined && v2 === undefined) return 'delete';
    if (v1 !== undefined && v2 !== undefined && !isEqual(v1, v2)) return 'replace';
    return null;
  }

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
            .filter(([_, paramSchema]) => {
              return !isType(paramSchema) && !paramSchema.ui_hidden;
            })
            .map(([k, blockElementSchema]) => {
              if (isType(blockElementSchema)) return null;
              const isBooleanInput =
                blockElementSchema.ui_element === ScanConfigUIElementDict.BooleanInput;
              const op_ = op(k);

              const patchBorderClass = () => {
                if (op_ === 'delete' || op_ === 'replace') return 'border-red-500';
                if (op_ === 'add') return 'border-[#1690ff]';
                return 'border-transparent';
              };

              // Gets the value so show in the input element
              const firstValue = () => {
                if (!op_ || op_ === 'delete' || op_ === 'replace' || !blockAIConfig) {
                  return state[k];
                }

                return blockAIConfig[k];
              };

              const value = firstValue();

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
                          <div className={cn('border rounded-lg flex-1 mr-1', patchBorderClass())}>
                            <UIElementRender
                              k={k}
                              disabled={disabled}
                              paramSchema={blockElementSchema}
                              value={value}
                              config={config}
                              schemaName={schemaName}
                              entity={entity}
                              schemaMappingConfig={schemaMappingConfig}
                              state={state}
                              setState={setState}
                            />
                          </div>
                          {(op_ === 'delete' || op_ === 'replace') && (
                            <CloseOutlined className="text-red-500! text-[16px]!" />
                          )}
                          {op_ === 'add' && <AIAdd />}
                        </div>

                        {op_ === 'replace' && !!blockAIConfig && (
                          <div className="flex items-center gap-1">
                            <div className="border rounded-lg border-[#1690ff] flex-1 mr-1">
                              <UIElementRender
                                k={k}
                                disabled={disabled}
                                paramSchema={blockElementSchema}
                                value={blockAIConfig[k]}
                                config={config}
                                schemaName={schemaName}
                                entity={entity}
                                schemaMappingConfig={schemaMappingConfig}
                                state={state}
                                setState={setState}
                              />
                            </div>
                            <AIAdd />
                          </div>
                        )}
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

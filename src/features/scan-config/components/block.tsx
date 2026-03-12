import { isNil } from 'es-toolkit/compat';
import { atom, useAtom, useAtomValue } from 'jotai';

import { UIElementRender } from '@/features/scan-config/components/ui-elements';
import { isPlainObject } from '@/features/scan-config/components/utils';
import {
  type Config,
  type ConfigValue,
  isType,
  ScanConfigUIElementDict,
  type SchemaName,
  type TBlock,
} from '@/features/scan-config/types';
import { configDiffsAtom } from '@/state/config-highlights';
import { TextPatternTransformer, urlRegex } from '@/ui/molecules/text-pattern-transformer';
import { TransformedLink } from '@/ui/molecules/text-pattern-transformer/link-item';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/molecules/tooltip';
import { cn } from '@/utils/css-class';

import type { IMEModel } from '@/api/entitycore/types';
import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { TSchemaMappingConfiguration } from '@/features/scan-config/components/hooks/schema';

import styles from './block.module.css';

export default function Block({
  schemaName,
  disabled,
  blockSchema,
  stateAtom,
  config,
  entity,
  hideTitle,
  schemaMappingConfig,
  rootElement,
  selectedEntry,
}: {
  schemaName: SchemaName;
  disabled: boolean;
  config: Config;
  blockSchema?: TBlock;
  entity: ICircuit | IMEModel | undefined | null;
  stateAtom: ReturnType<typeof atom<Record<string, ConfigValue>>> | null;
  hideTitle?: boolean;
  schemaMappingConfig: TSchemaMappingConfiguration | undefined;
  rootElement?: string;
  selectedEntry?: string;
}) {
  const [state, setState] = useAtom(stateAtom ?? atom<Record<string, ConfigValue>>({}));
  const diffs = useAtomValue(configDiffsAtom);
  
  // Helper function to get field change type
  const getFieldChangeType = (fieldName: string): 'add' | 'remove' | 'replace' | null => {
    if (!rootElement || diffs.length === 0) return null;
    
    // For root-level blocks (no selectedEntry), check path length 2: [rootElement, fieldName]
    if (!selectedEntry) {
      const fieldChange = diffs.find(
        (d) => 
          d.path.length === 2 && 
          d.path[0] === rootElement && 
          d.path[1] === fieldName
      );
      return fieldChange ? fieldChange.type : null;
    }
    
    // For dictionary entries, check if entire entry was added/removed
    const entryChange = diffs.find(
      (d) => d.path.length === 2 && d.path[0] === rootElement && d.path[1] === selectedEntry
    );
    if (entryChange) {
      return entryChange.type;
    }
    
    // Check for field-level change in dictionary entries
    const fieldChange = diffs.find(
      (d) => 
        d.path.length === 3 && 
        d.path[0] === rootElement && 
        d.path[1] === selectedEntry && 
        d.path[2] === fieldName
    );
    
    return fieldChange ? fieldChange.type : null;
  };

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
            .filter(([_, paramSchema]) => {
              return !isType(paramSchema) && !paramSchema.ui_hidden;
            })
            .map(([k, blockElementSchema]) => {
              if (isType(blockElementSchema)) return null;
              const isBooleanInput =
                blockElementSchema.ui_element === ScanConfigUIElementDict.BooleanInput;

              const value = state[k];
              const changeType = getFieldChangeType(k);
              
              // Determine CSS class based on change type
              const diffClassName = changeType
                ? changeType === 'add'
                  ? styles.diffAdded
                  : changeType === 'remove'
                  ? styles.diffRemoved
                  : styles.diffModified
                : undefined;

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
                              diffClassName,
                              !diffClassName && 'border-transparent'
                            )}
                          >
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

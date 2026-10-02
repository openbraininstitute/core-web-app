'use client';

import { UIElementRender } from '@/features/scan-config/components/ui-elements';
import {
  type Config,
  type ConfigSchema,
  type ConfigValue,
  isType,
  type ObjectElement,
  ScanConfigUIElementDict,
  type TSupportedEntitiesForScanConfiguration,
} from '@/features/scan-config/types';
import { MarkdownDescription } from '@/ui/molecules/markdown-description';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/molecules/tooltip';
import { cn } from '@/utils/css-class';

import { isPlainObject } from '../utils';

import type { TSchemaMappingConfiguration } from '@/features/scan-config/components/hooks/schema';
import type { Nullish } from '@/utils/type';

/**
 * `object`: a fixed-shape dict rendered like a `block_single`, one row per declared property with
 * its own nested `ui_element`. Editing a field writes just that key back into the object, which
 * bubbles up as a whole via `onChange`.
 */
export function ObjectField({
  value,
  paramSchema,
  disabled,
  config,
  schema,
  entity,
  schemaMappingConfig,
  errorPathPrefix,
  onChange,
}: {
  value: ConfigValue;
  paramSchema: ObjectElement;
  disabled: boolean;
  config: Config;
  schema: ConfigSchema;
  entity: TSupportedEntitiesForScanConfiguration | Nullish;
  schemaMappingConfig: TSchemaMappingConfiguration | undefined;
  errorPathPrefix?: string;
  onChange: (value: Record<string, ConfigValue>) => void;
}) {
  const objectValue = isPlainObject(value) ? value : {};

  return (
    <div
      className="border-neutral-2 flex flex-col gap-4 rounded-lg border bg-gray-50 p-4"
      data-scan-config-block-element={ScanConfigUIElementDict.Object}
    >
      {Object.entries(paramSchema.properties)
        .filter(([, fieldSchema]) => !isType(fieldSchema) && !fieldSchema.ui_hidden)
        .map(([fieldKey, fieldSchema]) => {
          if (isType(fieldSchema)) return null;
          return (
            <div
              key={fieldKey}
              className="flex w-full min-w-0 max-w-full flex-col"
              data-testid={`scan-config-field-${fieldKey}`}
            >
              <div className="mb-1 flex w-full items-center gap-0.5">
                <label
                  htmlFor={fieldKey}
                  className="text-primary-9 text-sm font-medium"
                  title={fieldSchema.description}
                >
                  {fieldSchema.title}
                </label>
                {fieldSchema.units && (
                  <div className="text-sm text-gray-500">{fieldSchema.units}</div>
                )}
              </div>

              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <div className="w-full min-w-0 max-w-full rounded-lg border border-transparent">
                      <UIElementRender
                        k={fieldKey}
                        disabled={disabled}
                        paramSchema={fieldSchema}
                        state={objectValue}
                        setState={onChange}
                        config={config}
                        schema={schema}
                        entity={entity}
                        schemaMappingConfig={schemaMappingConfig}
                        errorPathPrefix={errorPathPrefix}
                      />
                    </div>
                  </span>
                </TooltipTrigger>
                <TooltipContent
                  avoidCollisions
                  hideWhenDetached
                  align="center"
                  side="right"
                  className={cn(
                    'text-white shadow-bnb max-w-2xs min-w-2xs rounded-md',
                    'bg-primary-8 px-4 py-2 text-base text-wrap',
                    'overflow-y-auto max-h-50 primary-scrollbar'
                  )}
                  arrowClassName="bg-primary-8"
                >
                  <MarkdownDescription>{fieldSchema.description}</MarkdownDescription>
                </TooltipContent>
              </Tooltip>
            </div>
          );
        })}
    </div>
  );
}

export default ObjectField;

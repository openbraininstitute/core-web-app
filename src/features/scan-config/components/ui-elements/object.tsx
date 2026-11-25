'use client';

import { DESCRIPTION_TOOLTIP_CLASS } from '@/features/scan-config/components/shared/box-class';
import { FieldUnit } from '@/features/scan-config/components/shared/field-unit';
import { renderMathInText } from '@/features/scan-config/components/shared/render-math-in-text';
import {
  FieldControl,
  FieldLabel,
} from '@/features/scan-config/components/ui-elements/field-control';
import { useFieldLabelling } from '@/features/scan-config/components/ui-elements/field-labelling';
import {
  type ConfigSchema,
  type ConfigValue,
  isType,
  type ObjectElement,
  type ParamSchema,
  ScanConfigUIElementDict,
  type TSupportedEntitiesForScanConfiguration,
} from '@/features/scan-config/types';
import { PropsBlockScopeProvider } from '@/features/scan-config/use-config-store';
import { MarkdownDescription } from '@/ui/molecules/markdown-description';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/molecules/tooltip';

import { isPlainObject } from '../utils';

import type { TSchemaMappingConfiguration } from '@/features/scan-config/components/hooks/schema';
import type { Nullish } from '@/utils/type';

type TObjectFieldRowProps = {
  fieldKey: string;
  fieldSchema: ParamSchema;
  disabled: boolean;
  schema: ConfigSchema;
  entity: TSupportedEntitiesForScanConfiguration | Nullish;
  schemaMappingConfig: TSchemaMappingConfiguration | undefined;
  errorPathPrefix?: string;
};

function ObjectFieldRow({
  fieldKey,
  fieldSchema,
  disabled,
  schema,
  entity,
  schemaMappingConfig,
  errorPathPrefix,
}: TObjectFieldRowProps) {
  const labelling = useFieldLabelling(fieldSchema.ui_element);

  return (
    <div
      className="flex w-full min-w-0 max-w-full flex-col"
      data-testid={`scan-config-field-${fieldKey}`}
    >
      <div className="mb-1 flex w-full items-center gap-0.5">
        <FieldLabel
          controlId={labelling.controlId}
          labelId={labelling.labelId}
          className="text-primary-9 text-sm font-medium"
        >
          {renderMathInText(fieldSchema.title)}
        </FieldLabel>
        {fieldSchema.units && <FieldUnit unit={fieldSchema.units} className="ml-1 text-sm" />}
      </div>

      <Tooltip>
        <TooltipTrigger asChild>
          <span>
            <div
              {...labelling.group}
              className="w-full min-w-0 max-w-full rounded-lg border border-transparent"
            >
              <FieldControl
                fieldKey={fieldKey}
                disabled={disabled}
                paramSchema={fieldSchema}
                controlId={labelling.controlId}
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
          showArrow={false}
          className={DESCRIPTION_TOOLTIP_CLASS}
        >
          <MarkdownDescription>{fieldSchema.description}</MarkdownDescription>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

/**
 * `object`: a fixed-shape dict rendered like a `block_single`, one row per declared property with
 * its own nested `ui_element`. Editing a field writes just that key back into the object, which
 * bubbles up as a whole via `onChange`.
 */
export function ObjectField({
  value,
  paramSchema,
  disabled,
  schema,
  entity,
  schemaMappingConfig,
  errorPathPrefix,
  onChange,
}: {
  value: ConfigValue;
  paramSchema: ObjectElement;
  disabled: boolean;
  schema: ConfigSchema;
  entity: TSupportedEntitiesForScanConfiguration | Nullish;
  schemaMappingConfig: TSchemaMappingConfiguration | undefined;
  errorPathPrefix?: string;
  onChange: (value: Record<string, ConfigValue>) => void;
}) {
  const objectValue = isPlainObject(value) ? value : {};

  return (
    <PropsBlockScopeProvider state={objectValue} setState={onChange}>
      <div
        className="border-neutral-2 flex flex-col gap-4 rounded-lg border bg-gray-50 p-4"
        data-scan-config-block-element={ScanConfigUIElementDict.Object}
      >
        {Object.entries(paramSchema.properties)
          .filter(([, fieldSchema]) => !isType(fieldSchema) && !fieldSchema.ui_hidden)
          .map(([fieldKey, fieldSchema]) => {
            if (isType(fieldSchema)) return null;
            return (
              <ObjectFieldRow
                key={fieldKey}
                fieldKey={fieldKey}
                fieldSchema={fieldSchema}
                disabled={disabled}
                schema={schema}
                entity={entity}
                schemaMappingConfig={schemaMappingConfig}
                errorPathPrefix={errorPathPrefix}
              />
            );
          })}
      </div>
    </PropsBlockScopeProvider>
  );
}

export default ObjectField;

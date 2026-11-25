import { isNil } from 'es-toolkit/compat';

import { FieldDescriptionTooltip } from '@/features/scan-config/components/shared/field-description-tooltip';
import { FieldUnit } from '@/features/scan-config/components/shared/field-unit';
import { renderMathInText } from '@/features/scan-config/components/shared/render-math-in-text';
import {
  FieldIssueText,
  FieldLabel,
} from '@/features/scan-config/components/ui-elements/field-control';
import {
  useFieldIssueMark,
  useFieldLabelling,
} from '@/features/scan-config/components/ui-elements/field-labelling';
import { SweepCollapseButton } from '@/features/scan-config/components/ui-elements/parameter-sweep';
import { isReferenceFieldVisible } from '@/features/scan-config/components/ui-elements/reference';
import {
  FIELD_REGISTRY,
  useNeuronFilterProperties,
} from '@/features/scan-config/components/ui-elements/registry';
import { useBlockDiff } from '@/features/scan-config/hooks/use-block-diff';
import {
  type ConfigSchema,
  isType,
  type ParamSchema,
  ScanConfigUIElementDict,
  type TBlock,
  type TSupportedEntitiesForScanConfiguration,
} from '@/features/scan-config/types';
import { useField } from '@/features/scan-config/use-config-store';
import { MarkdownDescription } from '@/ui/molecules/markdown-description';
import { cn } from '@/utils/css-class';

import type { ReactNode } from 'react';
import type { TSchemaMappingConfiguration } from '@/features/scan-config/components/hooks/schema';
import type { Nullish } from '@/utils/type';

type TFieldRowProps = {
  fieldKey: string;
  paramSchema: ParamSchema;
  required: boolean;
  diffClass: string | undefined;
  schema: ConfigSchema;
  disabled: boolean;
  entity: TSupportedEntitiesForScanConfiguration | Nullish;
  schemaMappingConfig: TSchemaMappingConfiguration | undefined;
  selectedEntry?: string;
  errorPathPrefix?: string;
};

/**
 * A population is chosen but has no filterable property: a data condition, not a missing input,
 * so it is said instead of the field's own message.
 */
function NeuronFilterNotice({
  paramSchema,
  schemaMappingConfig,
  children,
}: Pick<TFieldRowProps, 'schemaMappingConfig'> & {
  children: ReactNode;
  paramSchema: Extract<
    ParamSchema,
    { ui_element: typeof ScanConfigUIElementDict.NeuronPropertyFilter }
  >;
}) {
  const { population, properties } = useNeuronFilterProperties(paramSchema, schemaMappingConfig);

  if (!population || Object.keys(properties).length > 0) return children;
  return <span className="text-red-500">No properties available</span>;
}

function FieldRow({ required, diffClass, ...control }: TFieldRowProps) {
  const { fieldKey, paramSchema, disabled, entity, schemaMappingConfig } = control;
  const [value, setValue] = useField(fieldKey);
  const requiredMissing = required && isNil(value);
  const { issue, issueId, controlAria } = useFieldIssueMark(
    control.errorPathPrefix,
    requiredMissing ? 'Required' : undefined
  );
  const issueText = <FieldIssueText id={issueId} issue={issue} requiredMissing={requiredMissing} />;
  const Field = FIELD_REGISTRY[paramSchema.ui_element];
  const labelling = useFieldLabelling(paramSchema.ui_element);
  const isBooleanInput = paramSchema.ui_element === ScanConfigUIElementDict.BooleanInput;
  const isPillField = paramSchema.ui_element === ScanConfigUIElementDict.ModelSelectorSingle;
  const isSweepField =
    paramSchema.ui_element === ScanConfigUIElementDict.FloatParameterSweep ||
    paramSchema.ui_element === ScanConfigUIElementDict.IntParameterSweep;

  return (
    <div
      className={cn('flex w-full min-w-0 max-w-full flex-col', {
        'flex-row items-center justify-between hover:bg-gray-100 p-2 rounded-lg': isBooleanInput,
      })}
      data-scan-config-block-element-container-of={paramSchema.ui_element}
      data-testid={`scan-config-field-${fieldKey}`}
    >
      <div className={cn('flex gap-0.5 w-full items-center', { 'mb-2': !isBooleanInput })}>
        <FieldLabel
          controlId={labelling.controlId}
          labelId={labelling.labelId}
          className={cn('text-primary-9 text-base font-semibold', {
            'cursor-pointer': isBooleanInput,
          })}
        >
          {renderMathInText(paramSchema.title)}
        </FieldLabel>
        {paramSchema.units && <FieldUnit unit={paramSchema.units} className="ml-1 text-base" />}
        {isSweepField && (
          <SweepCollapseButton
            value={value as null | number | (number | null)[]}
            disabled={disabled}
            onChange={setValue}
          />
        )}
      </div>

      <FieldDescriptionTooltip
        content={
          fieldKey === 'circuit' && entity ? (
            entity.description
          ) : (
            <MarkdownDescription>{paramSchema.description}</MarkdownDescription>
          )
        }
      >
        <span className="block w-full">
          <div
            {...labelling.group}
            aria-describedby={labelling.labelId && issueId}
            className={cn(
              'w-full min-w-0 max-w-full border',
              isPillField ? 'rounded-full' : 'rounded-lg',
              diffClass,
              !diffClass && 'border-transparent'
            )}
          >
            {Field && (
              <Field
                {...control}
                controlId={labelling.controlId}
                controlAria={controlAria}
                value={value}
                setValue={setValue}
              />
            )}
          </div>
        </span>
      </FieldDescriptionTooltip>

      {paramSchema.ui_element === ScanConfigUIElementDict.NeuronPropertyFilter ? (
        <NeuronFilterNotice paramSchema={paramSchema} schemaMappingConfig={schemaMappingConfig}>
          {issueText}
        </NeuronFilterNotice>
      ) : (
        issueText
      )}
    </div>
  );
}

/** The fields of one block. It reads and writes the block of the `BlockScopeProvider` above it. */
export default function Block({
  schema,
  disabled,
  blockSchema,
  entity,
  hideTitle,
  schemaMappingConfig,
  rootElement,
  selectedEntry,
  errorPathPrefix,
}: {
  schema: ConfigSchema;
  disabled: boolean;
  blockSchema?: TBlock;
  entity: TSupportedEntitiesForScanConfiguration | Nullish;
  hideTitle?: boolean;
  schemaMappingConfig: TSchemaMappingConfiguration | undefined;
  rootElement?: string;
  selectedEntry?: string;
  errorPathPrefix?: string;
}) {
  const { getFieldDiffClass } = useBlockDiff(rootElement, selectedEntry);

  if (!blockSchema) return null;

  // A property key is only unique inside its block: two recordings can both
  // have `dt`. E2E tests scope a field by its block before looking it up.
  const blockTestId = ['scan-config-block', rootElement, selectedEntry].filter(Boolean).join('-');

  return (
    <div
      className="flex w-full min-w-0 max-w-full flex-col gap-2"
      data-scan-config-block={ScanConfigUIElementDict.BlockSingle}
      data-testid={blockTestId}
    >
      {!hideTitle && (
        <>
          <div className="text-lg text-gray-500 wrap-break-word">
            {renderMathInText(blockSchema.title)}
          </div>
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
          Object.entries(blockSchema.properties).map(([fieldKey, paramSchema]) => {
            if (isType(paramSchema) || paramSchema.ui_hidden) return null;
            if (
              paramSchema.ui_element === ScanConfigUIElementDict.Reference &&
              !isReferenceFieldVisible(paramSchema, schema)
            ) {
              return null;
            }

            return (
              <FieldRow
                key={fieldKey}
                fieldKey={fieldKey}
                paramSchema={paramSchema}
                required={blockSchema.required?.includes(fieldKey) ?? false}
                diffClass={getFieldDiffClass(fieldKey)}
                schema={schema}
                disabled={disabled}
                entity={entity}
                schemaMappingConfig={schemaMappingConfig}
                selectedEntry={selectedEntry}
                errorPathPrefix={errorPathPrefix ? `${errorPathPrefix}/${fieldKey}` : undefined}
              />
            );
          })}
      </div>
    </div>
  );
}

export { Block };

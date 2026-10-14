import { isNil } from 'es-toolkit/compat';

import { UIElementRender } from '@/features/scan-config/components/ui-elements';
import { isReferenceFieldVisible } from '@/features/scan-config/components/ui-elements/reference';
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
import { renderMathInText } from '@/ui/segments/workflows/build/ion-channel-build/rjsf/helpers';

import type { ReactNode } from 'react';
import type { TSchemaMappingConfiguration } from '@/features/scan-config/components/hooks/schema';
import type { Nullish } from '@/utils/type';

/** The block's title and description, as one quiet card at the top of the column. */
function BlockHeader({
  title,
  description,
  actions,
}: {
  title?: string;
  description?: string;
  actions?: ReactNode;
}) {
  if (!title && !description) return null;
  return (
    <header className="mb-4 flex items-start gap-4 rounded-[14px] bg-white px-5 py-4 shadow-[0_1px_2px_rgb(0_39_102/0.06),0_2px_6px_-2px_rgb(0_39_102/0.08)]">
      <div className="min-w-0 flex-1">
        {title && (
          <h2 className="text-lg leading-snug font-semibold tracking-[-0.01em] text-balance wrap-break-word text-primary-9">
            {title}
          </h2>
        )}
        {description && (
          <MarkdownDescription className="mt-1.5 max-w-[68ch] text-sm leading-relaxed text-pretty text-neutral-5">
            {description}
          </MarkdownDescription>
        )}
      </div>
      {actions && <div className="-me-1 shrink-0">{actions}</div>}
    </header>
  );
}

export default function Block({
  schema,
  disabled,
  blockSchema,
  state,
  setState,
  config,
  entity,
  headerActions,
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
  /** Controls at the end of the header card, e.g. a union's reset. */
  headerActions?: ReactNode;
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
      <BlockHeader
        title={blockSchema.title}
        description={blockSchema.description}
        actions={headerActions}
      />

      <div className="flex flex-col gap-5">
        {blockSchema.properties &&
          Object.entries(blockSchema.properties)
            .filter(
              ([_, paramSchema]) =>
                !isType(paramSchema) &&
                !paramSchema.ui_hidden &&
                (paramSchema.ui_element !== ScanConfigUIElementDict.Reference ||
                  isReferenceFieldVisible(paramSchema, schema))
            )
            .map(([k, blockElementSchema]) => {
              if (isType(blockElementSchema)) return null;

              const value = state[k];
              const info =
                k === 'circuit' && entity ? entity.description : blockElementSchema.description;

              // Every element draws its whole field: the title in the border notch, info and
              // units on the border, the message underneath.
              return (
                <div
                  key={k}
                  className="flex w-full min-w-0 max-w-full flex-col"
                  data-scan-config-block-element-container-of={blockElementSchema.ui_element}
                  data-testid={`scan-config-field-${k}`}
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
                    errorPathPrefix={errorPathPrefix ? `${errorPathPrefix}/${k}` : undefined}
                    chrome={{
                      label: blockElementSchema.title,
                      labelInfo: info,
                      // units can carry LaTeX (`$\mu m$`), rendered like the ion-channel rows do
                      unit: blockElementSchema.units
                        ? renderMathInText(blockElementSchema.units)
                        : undefined,
                      error:
                        blockSchema.required?.includes(k) && isNil(value) ? 'Required' : undefined,
                      classNames: { fieldset: getFieldDiffClass(k) },
                    }}
                  />
                </div>
              );
            })}
      </div>
    </div>
  );
}

export { Block };

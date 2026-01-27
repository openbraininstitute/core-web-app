'use client';

import type { FieldProps, RJSFSchema } from '@rjsf/utils';
import { get } from 'es-toolkit/compat';
import katex from 'katex';
import renderMathInElement from 'katex/contrib/auto-render';
import { useCallback, useEffect, useMemo, useRef } from 'react';

import { renderMathInText } from '@/ui/segments/workflows/build/ion-channel-build/rjsf/helpers/render-mathematic-symbol';
import { cn } from '@/utils/css-class';

import 'katex/dist/katex.min.css';

type EquationOption = {
  value: string;
  label: string;
  latexEquation?: string;
  schema: RJSFSchema;
};

type EquationCardProps = {
  option: EquationOption;
  onSelect: (value: string) => void;
  disabled: boolean;
  readonly: boolean;
  selected: boolean;
};

function renderLatex(latex: string): string {
  try {
    return katex.renderToString(latex, {
      throwOnError: false,
      displayMode: false,
    });
  } catch (_error) {
    return latex;
  }
}

function EquationCard({ option, onSelect, disabled, readonly, selected }: EquationCardProps) {
  const ref = useRef<HTMLButtonElement>(null);
  const handleSelect = useCallback(() => {
    if (disabled || readonly) {
      return;
    }
    onSelect(option.value);
  }, [disabled, readonly, onSelect, option.value]);

  const description =
    typeof option.schema.description === 'string' && option.schema.description.length > 0
      ? option.schema.description
      : undefined;

  useEffect(() => {
    if (ref.current)
      renderMathInElement(ref.current, {
        delimiters: [
          { left: '\\(', right: '\\)', display: false },
          { left: '\\[', right: '\\]', display: true },
          { left: '$$', right: '$$', display: true },
          { left: '$', right: '$', display: false },
        ],
      });
  }, []);

  return (
    <div>
      <button
        ref={ref}
        type="button"
        onClick={handleSelect}
        disabled={disabled || readonly}
        className={cn(
          'group relative w-full rounded-lg border-2 border-slate-200 bg-white',
          'p-4 text-left transition-all duration-200',
          'hover:border-primary-8 hover:shadow-md',
          'focus:ring-0 focus:outline-none',
          'disabled:cursor-not-allowed disabled:opacity-50',
          { 'border-primary-9 shadow-bnb bg-white': selected }
        )}
      >
        <div className="group-hover:text-primary-600 text-primary-9 text-base font-semibold">
          {renderMathInText(option.label)}
        </div>
        {description ? (
          <p className="mt-2 text-sm leading-relaxed text-slate-600">{description}</p>
        ) : null}
      </button>
      {selected && (
        <div className="rounded bg-gray-50 p-4">
          <div
            className="flex items-center justify-center text-2xl select-none"
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{
              __html: renderLatex(option.latexEquation as string),
            }}
          />
        </div>
      )}
    </div>
  );
}

export function EquationSelectorField(props: FieldProps) {
  const { schema, formData, onChange, name, disabled, readonly, errorSchema, rawErrors } = props;
  const isInvalid =
    (errorSchema && Object.keys(errorSchema).length > 0) || (rawErrors && rawErrors.length > 0);
  const entry = schema.anyOf ?? schema.oneOf;

  const options = useMemo(() => {
    let opts: Array<EquationOption> = [];
    if (schema.anyOf) {
      opts = (entry
        ?.filter((p) => get(p, 'type') !== 'null')
        .flatMap((o) => {
          const items = get(o, 'oneOf', null);
          if (Array.isArray(items)) {
            return items.map((i) => ({
              value: get(i, 'properties.type.const', ''),
              label: get(i, 'title'),
              latexEquation: get(i, 'latex_equation'),
              schema,
            }));
          }

          return [
            {
              value: get(items, 'properties.type.const', ''),
              label: get(items, 'title'),
              latexEquation: get(items, 'latex_equation'),
              schema,
            },
          ];
        }) ?? []) as Array<EquationOption>;
    } else {
      opts = (schema.oneOf?.map((i) => ({
        value: get(i, 'properties.type.const', ''),
        label: get(i, 'title'),
        latexEquation: get(i, 'latex_equation'),
        schema,
      })) ?? []) as Array<EquationOption>;
    }
    return opts;
  }, [entry, schema]);

  const selectedOption = useMemo(
    () => options.find((option: EquationOption) => option.value === formData?.type),
    [options, formData]
  );

  const handleOptionSelect = (option: EquationOption) => {
    onChange(option.value, [name, 'type']);
  };

  return (
    <div className="flex flex-col gap-2 py-4" aria-invalid={isInvalid ? 'true' : undefined}>
      {options?.map((option) => (
        <EquationCard
          key={option.value}
          option={option}
          onSelect={() => handleOptionSelect(option)}
          disabled={Boolean(disabled)}
          readonly={Boolean(readonly)}
          selected={selectedOption?.value === option.value}
        />
      ))}
    </div>
  );
}

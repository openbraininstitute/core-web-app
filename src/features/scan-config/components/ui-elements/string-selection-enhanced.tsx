'use client';

import { RiArrowDownSLine, RiExpandDiagonalLine } from '@remixicon/react';
import katex from 'katex';
import { useCallback, useMemo, useState } from 'react';

import 'katex/dist/katex.min.css';

import { ScanConfigUIElementDict } from '@/features/scan-config/types';
import { Modal } from '@/ui/molecules/modal';
import { Popover, PopoverContent, PopoverTrigger } from '@/ui/molecules/popover';
import { cn } from '@/utils/css-class';

import type { StringSelectionEnhanced as TStringSelectionEnhanced } from '@/features/scan-config/types';

/** renders a raw LaTeX expression (e.g. `A_{latex}`) to a KaTeX HTML string */
function renderLatex(latex: string): string {
  return katex.renderToString(latex, { throwOnError: false, displayMode: true, output: 'html' });
}

/** a single enum option's content: title, description and optional rendered formula */
type TOptionContent = {
  title: string;
  description?: string;
  latexHtml?: string;
};

/**
 * Presentational content for one option — title, description and optional LaTeX formula. Shared by
 * the collapsed trigger (the selected option) and each row of the open list, so both render
 * identically. When `onExpandLatex` is provided, the formula shows an expand affordance.
 */
function OptionContent({
  content,
  onExpandLatex,
}: {
  content: TOptionContent;
  onExpandLatex?: () => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-primary-8 text-lg font-bold">{content.title}</span>
      {content.description && <span className="text-sm text-gray-700">{content.description}</span>}
      {content.latexHtml && (
        <div className="relative rounded-md border-t border-gray-100 pt-2">
          <div
            // biome-ignore lint/security/noDangerouslySetInnerHtml: KaTeX output, source from schema
            dangerouslySetInnerHTML={{ __html: content.latexHtml }}
            className="overflow-x-auto"
          />
          {onExpandLatex && (
            <button
              type="button"
              aria-label="Expand formula"
              onClick={(e) => {
                e.stopPropagation();
                onExpandLatex();
              }}
              className="bg-primary-8 absolute right-2 bottom-2 flex size-8 items-center justify-center rounded-full text-white"
            >
              <RiExpandDiagonalLine className="size-4" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export interface IStringSelectionEnhancedProps {
  value: string | null;
  onChange: (value: string) => void;
  disabled?: boolean;
  paramSchema: TStringSelectionEnhanced;
}

/**
 * Rich dropdown for the `string_selection_enhanced` schema UI element.
 *
 * Beyond a plain string select, each enum option can carry a custom `title_by_key`, a
 * `description_by_key` blurb and a `latex_by_key` formula. The collapsed trigger previews the
 * selected option; the open popover lists every option as a card (the selected one highlighted), and
 * formulas can be expanded into a modal for a larger view.
 *
 * @example schema
 * {
 *   "type": "string",
 *   "enum": ["PointSource", "LineSource", "ObjectiveCSD"],
 *   "title_by_key": { "PointSource": "Point Source", ... },
 *   "description_by_key": { "PointSource": "Calculate …", ... },
 *   "ui_element": "string_selection_enhanced"
 * }
 */
export function StringSelectionEnhanced({
  value,
  onChange,
  disabled = false,
  paramSchema,
}: IStringSelectionEnhancedProps) {
  const [open, setOpen] = useState(false);
  const [expandedLatexHtml, setExpandedLatexHtml] = useState<string | null>(null);

  // Pre-render each option's content once per schema — KaTeX rendering is the only non-trivial cost.
  const optionContentByKey = useMemo(() => {
    const { enum: options, title_by_key, description_by_key, latex_by_key } = paramSchema;
    return new Map<string, TOptionContent>(
      options.map((key) => {
        const latex = latex_by_key?.[key];
        return [
          key,
          {
            title: title_by_key?.[key] ?? key,
            description: description_by_key?.[key],
            latexHtml: latex ? renderLatex(latex) : undefined,
          },
        ];
      })
    );
  }, [paramSchema]);

  const selectedContent = value ? optionContentByKey.get(value) : undefined;

  const handleSelect = useCallback(
    (key: string) => {
      onChange(key);
      setOpen(false);
    },
    [onChange]
  );

  return (
    <>
      <Popover open={open} onOpenChange={disabled ? undefined : setOpen}>
        <PopoverTrigger asChild disabled={disabled}>
          <button
            type="button"
            data-scan-config-block-element={ScanConfigUIElementDict.StringSelectionEnhanced}
            disabled={disabled}
            className={cn(
              'flex w-full items-start justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4 text-left',
              disabled ? 'cursor-not-allowed opacity-60' : 'hover:border-gray-300'
            )}
          >
            {selectedContent ? (
              <OptionContent content={selectedContent} />
            ) : (
              <span className="text-gray-400">Select option</span>
            )}
            <RiArrowDownSLine
              className={cn(
                'mt-1 size-5 shrink-0 text-gray-500 transition-transform',
                open && 'rotate-180'
              )}
            />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className={cn(
            'max-h-100 w-(--radix-popover-trigger-width) overflow-y-auto rounded-2xl border border-gray-100 bg-white p-2 shadow-md'
          )}
        >
          {/* role="option" rows (not <button>) so the per-option expand <button> in OptionContent
              isn't nested inside another button (invalid DOM); selection is keyboard-accessible. */}
          <div role="listbox" className="flex flex-col gap-2">
            {paramSchema.enum.map((key) => {
              const content = optionContentByKey.get(key);
              if (!content) return null;
              const selected = key === value;
              return (
                <div
                  key={key}
                  role="option"
                  aria-selected={selected}
                  tabIndex={0}
                  onClick={() => handleSelect(key)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleSelect(key);
                    }
                  }}
                  className={cn(
                    'cursor-pointer rounded-2xl p-3 text-left',
                    selected
                      ? 'bg-gray-100! w-[95%] self-center border border-gray-200 shadow-sm transition-all duration-200 ease-in-out hover:w-full'
                      : 'w-full hover:bg-gray-50'
                  )}
                >
                  <OptionContent
                    content={content}
                    onExpandLatex={
                      content.latexHtml
                        ? () => setExpandedLatexHtml(content.latexHtml ?? null)
                        : undefined
                    }
                  />
                </div>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>

      <Modal open={expandedLatexHtml !== null} onClose={() => setExpandedLatexHtml(null)} size="lg">
        {expandedLatexHtml && (
          <div
            // biome-ignore lint/security/noDangerouslySetInnerHtml: KaTeX output, source from schema
            dangerouslySetInnerHTML={{ __html: expandedLatexHtml }}
            className="overflow-x-auto p-6 text-xl"
          />
        )}
      </Modal>
    </>
  );
}

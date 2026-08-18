'use client';

import { RiArrowDownSLine, RiExpandDiagonalLine } from '@remixicon/react';
import katex from 'katex';
import { useCallback, useMemo, useState } from 'react';

import 'katex/dist/katex.min.css';

import { ScanConfigUIElementDict } from '@/features/scan-config/types';
import { MarkdownDescription } from '@/ui/molecules/markdown-description';
import { Modal } from '@/ui/molecules/modal';
import { ExpandableText } from '@/ui/molecules/more-less-text';
import { Popover, PopoverContent, PopoverTrigger } from '@/ui/molecules/popover';
import { cn } from '@/utils/css-class';

import type { KeyboardEvent, MouseEvent, PointerEvent, SyntheticEvent } from 'react';
import type { StringSelectionEnhanced as TStringSelectionEnhanced } from '@/features/scan-config/types';

const DESCRIPTION_COLLAPSED_LINES = 3;

/** renders a raw LaTeX expression (e.g. `A_{latex}`) to a KaTeX HTML string */
function renderLatex(latex: string): string {
  return katex.renderToString(latex, { throwOnError: false, displayMode: true, output: 'html' });
}

function stopNestedAction(event: SyntheticEvent): void {
  event.preventDefault();
  event.stopPropagation();
}

/** a single enum option's content: title, description and optional rendered formula */
type TOptionContent = {
  title: string;
  description?: string;
  latexHtml?: string;
};

function DescriptionToggle({ isExpanded, toggle }: { isExpanded: boolean; toggle: () => void }) {
  return (
    <button
      type="button"
      aria-expanded={isExpanded}
      onClick={(event: MouseEvent<HTMLButtonElement>) => {
        stopNestedAction(event);
        toggle();
      }}
      onPointerDown={(event: PointerEvent<HTMLButtonElement>) => {
        stopNestedAction(event);
      }}
      onKeyDown={(event: KeyboardEvent<HTMLButtonElement>) => {
        event.stopPropagation();
      }}
      className="text-primary-8 text-xs font-medium underline underline-offset-2"
    >
      {isExpanded ? 'Show less' : 'Show more'}
    </button>
  );
}

function OptionContent({
  content,
  onExpandLatex,
}: {
  content: TOptionContent;
  onExpandLatex?: () => void;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <span className="text-primary-8 text-lg font-bold">{content.title}</span>
      {content.description && (
        <ExpandableText
          key={content.description}
          text={content.description}
          content={
            <MarkdownDescription className="text-sm text-gray-700">
              {content.description}
            </MarkdownDescription>
          }
          collapsedLines={DESCRIPTION_COLLAPSED_LINES}
          className="text-sm leading-5 text-gray-700"
          btnWrapperClassName="mt-1"
        >
          {({ isExpanded, toggle }) => (
            <DescriptionToggle isExpanded={isExpanded} toggle={toggle} />
          )}
        </ExpandableText>
      )}
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
 * rich dropdown for the `string_selection_enhanced` schema UI element
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
  const options = paramSchema.enum ?? [];

  // Pre-render each option's content once per schema — KaTeX rendering is the only non-trivial cost.
  const optionContentByKey = useMemo(() => {
    const { enum: enumOptions, title_by_key, description_by_key, latex_by_key } = paramSchema;
    return new Map<string, TOptionContent>(
      (enumOptions ?? []).map((key) => {
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
          <div
            role="combobox"
            aria-expanded={open}
            aria-haspopup="listbox"
            aria-disabled={disabled || undefined}
            tabIndex={disabled ? -1 : 0}
            data-scan-config-block-element={ScanConfigUIElementDict.StringSelectionEnhanced}
            onKeyDown={(event) => {
              if (disabled) return;
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                event.currentTarget.click();
              }
            }}
            className={cn(
              'flex w-full items-start justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4 text-left',
              disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:border-gray-300'
            )}
          >
            {selectedContent ? (
              <OptionContent key={value} content={selectedContent} />
            ) : (
              <span className="text-gray-400">Select option</span>
            )}
            <RiArrowDownSLine
              className={cn(
                'mt-1 size-5 shrink-0 text-gray-500 transition-transform',
                open && 'rotate-180'
              )}
            />
          </div>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          side="bottom"
          collisionPadding={12}
          className={cn(
            'flex w-(--radix-popover-trigger-width) flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white p-2 shadow-md',
            'max-h-[min(24rem,var(--radix-popover-content-available-height,24rem))]'
          )}
        >
          <div
            role="listbox"
            className="secondary-scrollbar flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overscroll-contain"
          >
            {options.map((key) => {
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

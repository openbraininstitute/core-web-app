'use client';

import {
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import { RiArrowDropDownLine, RiInfoI } from '@remixicon/react';
import { cva } from 'class-variance-authority';

import { MarkdownDescription } from '@/ui/molecules/markdown-description';
import { Tooltip, TooltipArrow, TooltipContent, TooltipTrigger } from '@/ui/molecules/tooltip';
import { cn } from '@/utils/css-class';

import type { ReactNode } from 'react';

export type FancyVariant = 'default' | 'success' | 'warning' | 'error' | 'info';
export type FancyLabelPosition = 'left' | 'right';

export type FancyFieldClassNames = {
  root?: string;
  fieldset?: string;
  legend?: string;
  /** The row on the top border opposite the label. */
  border?: string;
  message?: string;
  /** Control-specific parts; ignored by controls that don't have them. */
  input?: string;
  actions?: string;
  children?: string;
  trigger?: string;
  panel?: string;
};

/** What a field says about itself; every fancy control accepts these. */
export type FancyChrome = {
  /** Cut into the top border at the reading start. */
  label?: string;
  labelPosition?: FancyLabelPosition;
  /** Tooltip content of the info icon on the top border, opposite the label. */
  labelInfo?: ReactNode;
  /** Shown after the label, e.g. `ms` reads "Duration (ms)". */
  unit?: ReactNode;
  error?: string;
  helperText?: ReactNode;
  classNames?: FancyFieldClassNames;
};

const fieldsetVariants = cva(
  'group/field relative min-w-0 rounded-lg border bg-white text-start transition-colors',
  {
    variants: {
      variant: {
        default: 'border-neutral-2',
        success: 'border-green-main',
        warning: 'border-warning',
        error: 'border-destructive',
        info: 'border-primary-5',
      },
      disabled: { true: 'cursor-not-allowed bg-neutral-1 opacity-60', false: '' },
    },
    defaultVariants: { variant: 'default', disabled: false },
  }
);

const FOCUS: Record<FancyVariant, string> = {
  default:
    'hover:border-neutral-3 focus-within:border-primary-8 focus-within:hover:border-primary-8 focus-within:ring-2 focus-within:ring-primary-8/10',
  success: 'focus-within:ring-2 focus-within:ring-green-main/15',
  warning: 'focus-within:ring-2 focus-within:ring-warning/15',
  error: 'focus-within:ring-2 focus-within:ring-destructive/15',
  info: 'focus-within:ring-2 focus-within:ring-primary-5/15',
};

const ACTIVE: Record<FancyVariant, string> = {
  default: 'border-primary-8 ring-2 ring-primary-8/10',
  success: 'ring-2 ring-green-main/15',
  warning: 'ring-2 ring-warning/15',
  error: 'ring-2 ring-destructive/15',
  info: 'ring-2 ring-primary-5/15',
};

const TONE: Record<FancyVariant, string> = {
  default: 'text-primary-9',
  success: 'text-green-main',
  warning: 'text-warning',
  error: 'text-destructive',
  info: 'text-primary-5',
};

const MESSAGE_ICON: Record<FancyVariant, ReactNode> = {
  default: null,
  success: <CheckCircleOutlined />,
  warning: <ExclamationCircleOutlined />,
  error: <ExclamationCircleOutlined />,
  info: <InfoCircleOutlined />,
};

/** An icon button inside {@link FancyIconGroup}; the hovered one fills with the brand colour. */
export const FANCY_BORDER_BUTTON =
  'inline-flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-full text-xs text-primary-8 ring-1 ring-transparent transition-colors outline-none hover:bg-primary-8 hover:text-white focus-visible:ring-primary-8/40 active:scale-95 disabled:pointer-events-none disabled:opacity-50 aria-pressed:bg-primary-8 aria-pressed:text-white';

/** One white pill holding a field's border controls: its actions and its info. */
export function FancyIconGroup({ children }: { children: ReactNode }) {
  return (
    // A lone icon (just the info) drops the padding, so it is no bigger than an icon in a pill.
    <div className="flex items-center gap-0.5 rounded-full bg-white p-0.5 ring-1 ring-neutral-2 has-[>:only-child]:p-0">
      {children}
    </div>
  );
}

/**
 * The field's explanation: a bare "i" that sits in the same pill as the field's actions (or in a
 * pill of its own). Its tooltip opens above, end-aligned, with a rounded arrow on the icon.
 */
export function FancyInfo({ content, className }: { content: ReactNode; className?: string }) {
  return (
    <Tooltip delayDuration={150}>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label="More information"
          className={cn(FANCY_BORDER_BUTTON, 'cursor-help text-neutral-500', className)}
        >
          <RiInfoI className="size-3.5" />
        </button>
      </TooltipTrigger>
      {/* One width for every field, so tooltips read as one family. End-aligned and nudged past
          the icon, so the body sits to its left and the arrow clears the rounded corner. */}
      <TooltipContent
        side="top"
        align="end"
        alignOffset={-10}
        sideOffset={3}
        arrowPadding={14}
        showArrow={false}
        // Justified so every line runs the full width instead of a ragged, balanced edge.
        className="w-64 rounded-xl border border-neutral-200 bg-white p-3 text-justify text-xs leading-relaxed text-wrap hyphens-auto text-primary-9 shadow-xl"
      >
        {typeof content === 'string' ? (
          <MarkdownDescription className="text-xs leading-relaxed">{content}</MarkdownDescription>
        ) : (
          content
        )}
        {/* A white wedge with a rounded tip, stroked on its two slanted edges only; lifted 1px so
            its fill covers the body's bottom border where they meet. */}
        <TooltipArrow asChild width={16} height={8}>
          <svg viewBox="0 0 16 8" className="-translate-y-px overflow-visible" aria-hidden="true">
            <path
              d="M0 0 L6.4 6.6 Q8 8.2 9.6 6.6 L16 0"
              className="fill-white stroke-neutral-200"
              strokeWidth={1}
              strokeLinejoin="round"
            />
          </svg>
        </TooltipArrow>
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * The dropdown caret every fancy select uses; turns over while its panel is open. Inside a radix
 * trigger, pass `className="group-data-[state=open]/select:rotate-180"` and mark the trigger
 * `group/select` instead of `open`.
 */
export function FancyChevron({ open = false, className }: { open?: boolean; className?: string }) {
  return (
    <RiArrowDropDownLine
      aria-hidden
      className={cn(
        'size-5 shrink-0 text-neutral-4 transition-transform duration-200 ease-out motion-reduce:transition-none',
        open && 'rotate-180',
        className
      )}
    />
  );
}

/** A stretch of the field's border, drawn where the legend has cut the native one. */
function BorderLine({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn('h-0 self-center border-t [border-color:inherit]', className)}
    />
  );
}

/**
 * The bordered frame every fancy control draws: the label (and unit) notched into the top border,
 * border actions and the info icon on the same line at the other end, and one message underneath.
 * Use it directly to give a custom control the same chrome.
 */
export function FancyField({
  label,
  labelPosition = 'left',
  labelInfo,
  unit,
  error,
  helperText,
  classNames,
  className,
  variant = 'default',
  disabled = false,
  active = false,
  htmlFor,
  labelId,
  messageId,
  borderActions,
  hideLegend = false,
  group = false,
  children,
}: FancyChrome & {
  className?: string;
  variant?: FancyVariant;
  disabled?: boolean;
  /** Draws the focus treatment while focus is elsewhere, e.g. inside a portalled panel. */
  active?: boolean;
  /** id of the control the label names; without it the label is a plain span with `labelId`. */
  htmlFor?: string;
  labelId?: string;
  messageId?: string;
  /** Buttons on the top border, before the info icon. */
  borderActions?: ReactNode;
  /** For controls that draw their own label, e.g. a floating one. */
  hideLegend?: boolean;
  /** A frame around other fields: it doesn't light up when one of them has focus. */
  group?: boolean;
  children: ReactNode;
}) {
  const tone: FancyVariant = error ? 'error' : variant;
  const hasLegend = !!label && !hideLegend;
  const fullLabel = unit ? (
    <>
      {label} ({unit})
    </>
  ) : (
    label
  );
  const hasControls = !!borderActions || !!labelInfo;
  const controls = (
    <div className={cn('flex items-center [border-color:inherit]', classNames?.border)}>
      {/* One pill for everything on the border: the actions, then the info. */}
      <FancyIconGroup>
        {borderActions}
        {labelInfo && <FancyInfo content={labelInfo} />}
      </FancyIconGroup>
    </div>
  );

  return (
    <div className={cn('w-full min-w-0', classNames?.root, className)}>
      <fieldset
        className={cn(
          fieldsetVariants({ variant: tone, disabled }),
          !group && FOCUS[tone],
          active && ACTIVE[tone],
          classNames?.fieldset
        )}
      >
        {hasLegend ? (
          /*
           * The whole top line lives in the legend: label, a drawn stretch of border, then the
           * controls. A legend is always centred on the border and the content starts below it,
           * so a label that wraps to several lines stays centred and never covers the inputs.
           * The legend spans the field, which cuts the native border, so `BorderLine` redraws it
           * in the gaps with the fieldset's own (hover, focus, diff) border colour.
           */
          <legend
            className={cn(
              'mx-3 flex w-[calc(100%-1.5rem)] items-center [border-color:inherit]',
              labelPosition === 'right' && 'flex-row-reverse'
            )}
          >
            {/* White and rounded, so the focus ring and hover border never run under the text. */}
            <span
              className={cn(
                'min-w-0 rounded-lg bg-white px-1.5 text-xs leading-4 font-semibold text-pretty wrap-break-word transition-colors duration-200',
                TONE[tone],
                !group && tone === 'default' && 'group-focus-within/field:text-primary-8',
                active && tone === 'default' && 'text-primary-8',
                classNames?.legend
              )}
            >
              {htmlFor ? (
                <label htmlFor={htmlFor} id={labelId}>
                  {fullLabel}
                </label>
              ) : (
                <span id={labelId}>{fullLabel}</span>
              )}
            </span>
            <BorderLine className="min-w-3 flex-1" />
            {/* Pulled in vertically so the controls never make the label row taller. */}
            {hasControls && (
              <div className="-my-1.5 flex shrink-0 [border-color:inherit]">{controls}</div>
            )}
          </legend>
        ) : (
          hasControls && (
            <div
              className={cn(
                'absolute top-0 z-20 -translate-y-1/2 [border-color:inherit]',
                labelPosition === 'left' ? 'end-3' : 'start-3'
              )}
            >
              {controls}
            </div>
          )
        )}

        {children}
      </fieldset>

      {(error || helperText) && (
        <p
          id={messageId}
          role={error ? 'alert' : undefined}
          className={cn(
            'mt-1.5 flex items-center gap-1.5 px-1 text-xs',
            error ? 'text-destructive' : tone === 'default' ? 'text-neutral-4' : TONE[tone],
            classNames?.message
          )}
        >
          {MESSAGE_ICON[tone]}
          {error ?? helperText}
        </p>
      )}
    </div>
  );
}

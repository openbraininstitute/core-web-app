'use client';

import { cva } from 'class-variance-authority';
import { type ReactNode, type Ref, useEffect, useId, useState } from 'react';

import {
  FANCY_BORDER_BUTTON,
  type FancyChrome,
  FancyField,
  type FancyVariant,
} from '@/ui/molecules/fancy-input/field';
import { cn } from '@/utils/css-class';

import {
  type Validate,
  type ValidationResult,
  type ValidationRules,
  validateValue,
} from './validation';

import type * as React from 'react';

export type FancyLabelMode = 'static' | 'floating';
export type FancyValidateOn = 'blur' | 'change' | 'submit';
export type FancyActionAppearance = 'ghost' | 'rounded';

const actionButtonVariants = cva(
  'inline-flex size-7 shrink-0 cursor-pointer items-center justify-center text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-8/40 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      appearance: {
        ghost:
          'rounded-full text-neutral-4 hover:bg-primary-8 hover:text-white aria-pressed:bg-primary-8 aria-pressed:text-white',
        rounded:
          'rounded-full bg-white text-primary-8 ring-1 ring-neutral-2 hover:bg-primary-8 hover:text-white hover:ring-primary-8 active:scale-95 aria-pressed:bg-primary-8 aria-pressed:text-white',
      },
    },
    defaultVariants: { appearance: 'ghost' },
  }
);

export type FancyInputAction = {
  key: string;
  icon: ReactNode;
  /** Accessible label, also the button's title. */
  label: string;
  onClick: () => void;
  /** Set for toggles; announced, and drawn filled. */
  pressed?: boolean;
  disabled?: boolean;
  className?: string;
  appearance?: FancyActionAppearance;
  'data-testid'?: string;
};

/** A row of action buttons; also usable inside a custom `FancyField`. */
export function FancyActions({
  actions,
  onBorder = false,
  appearance = 'ghost',
  disabled,
}: {
  actions?: Array<FancyInputAction>;
  /** Border actions share the info icon's pill. */
  onBorder?: boolean;
  appearance?: FancyActionAppearance;
  disabled?: boolean;
}) {
  return actions?.map((action) => (
    <button
      key={action.key}
      type="button"
      data-testid={action['data-testid']}
      aria-label={action.label}
      aria-pressed={action.pressed}
      title={action.label}
      onClick={action.onClick}
      disabled={disabled || action.disabled}
      className={cn(
        onBorder
          ? FANCY_BORDER_BUTTON
          : actionButtonVariants({ appearance: action.appearance ?? appearance }),
        action.className
      )}
    >
      {action.icon}
    </button>
  ));
}

type FieldElement = HTMLInputElement | HTMLTextAreaElement;

export type FancyInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement> & React.TextareaHTMLAttributes<HTMLTextAreaElement>,
  'size' | 'children' | 'onChange' | 'onBlur' | 'onFocus' | 'rows'
> &
  FancyChrome & {
    ref?: Ref<FieldElement>;
    labelMode?: FancyLabelMode;
    /** Visual state. An error always wins over it. */
    variant?: FancyVariant;
    /** Keyword ("email", "number"…) or a zod schema. */
    validate?: Validate;
    validationRules?: ValidationRules;
    /** @default "blur" */
    validateOn?: FancyValidateOn;
    /** Buttons inside the field, after the value. */
    actions?: Array<FancyInputAction>;
    /** Field-level buttons on the top border, before the info icon. */
    borderActions?: Array<FancyInputAction>;
    actionAppearance?: FancyActionAppearance;
    /** Nested fields under the input, inside the same border; e.g. the extra values of a list. */
    children?: ReactNode;
    /** Renders a `<textarea>` in the same chrome. */
    multiline?: boolean;
    /** @default 3 */
    rows?: number;
    onValueChange?: (value: string, result: ValidationResult) => void;
    onChange?: (e: React.ChangeEvent<FieldElement>) => void;
    onBlur?: (e: React.FocusEvent<FieldElement>) => void;
    onFocus?: (e: React.FocusEvent<FieldElement>) => void;
    /** Lets a parent form trigger validation imperatively. */
    validateRef?: React.RefObject<(() => boolean) | null>;
  };

export function FancyInput({
  ref,
  label,
  labelPosition = 'left',
  labelMode = 'static',
  labelInfo,
  unit,
  helperText,
  error: controlledError,
  classNames,
  variant = 'default',
  validate,
  validationRules,
  validateOn = 'blur',
  actions,
  borderActions,
  actionAppearance = 'ghost',
  multiline = false,
  rows = 3,
  children,
  className,
  disabled,
  value: valueProp,
  defaultValue,
  onValueChange,
  onChange,
  onBlur,
  onFocus,
  validateRef,
  id,
  placeholder,
  ...inputProps
}: FancyInputProps) {
  const reactId = useId();
  const inputId = id ?? reactId;
  const messageId = `${inputId}-message`;

  const isControlled = valueProp !== undefined;
  const [internalValue, setInternalValue] = useState(String(defaultValue ?? ''));
  const value = isControlled ? String(valueProp ?? '') : internalValue;

  const [touched, setTouched] = useState(false);
  const [focused, setFocused] = useState(false);
  const [internalError, setInternalError] = useState<string>();

  const runValidation = (v: string) => {
    const result = validateValue(v, validate, validationRules);
    setInternalError(result.error);
    return result;
  };

  useEffect(() => {
    if (!validateRef) return;
    validateRef.current = () => {
      setTouched(true);
      return runValidation(value).valid;
    };
    return () => {
      validateRef.current = null;
    };
  });

  const activeError = controlledError ?? (touched ? internalError : undefined);
  const tone: FancyVariant = activeError ? 'error' : variant;

  const handleChange = (e: React.ChangeEvent<FieldElement>) => {
    const next = e.target.value;
    if (!isControlled) setInternalValue(next);

    let result: ValidationResult = { valid: true };
    if (validateOn === 'change') {
      setTouched(true);
      result = runValidation(next);
    } else if (touched && internalError) {
      // Clear a stale error as soon as the value is fixed, instead of waiting for the next blur.
      result = runValidation(next);
    }
    onChange?.(e);
    onValueChange?.(next, result);
  };

  const handleBlur = (e: React.FocusEvent<FieldElement>) => {
    setFocused(false);
    if (validateOn !== 'submit') {
      setTouched(true);
      runValidation(e.target.value);
    }
    onBlur?.(e);
  };

  const handleFocus = (e: React.FocusEvent<FieldElement>) => {
    setFocused(true);
    onFocus?.(e);
  };

  const isFloating = labelMode === 'floating';
  const labelIsUp = !isFloating || focused || value !== '' || !!placeholder;

  const fieldProps = {
    id: inputId,
    value,
    disabled,
    placeholder: isFloating && !labelIsUp ? '' : placeholder,
    'aria-invalid': !!activeError,
    'aria-describedby': activeError || helperText ? messageId : undefined,
    onChange: handleChange,
    onFocus: handleFocus,
    onBlur: handleBlur,
    ...inputProps,
  };
  const fieldClassName = cn(
    'w-full min-w-0 bg-transparent px-3 py-2 text-sm text-primary-9 outline-none placeholder:text-neutral-3 disabled:cursor-not-allowed',
    classNames?.input
  );

  return (
    <FancyField
      label={label}
      labelPosition={labelPosition}
      labelInfo={labelInfo}
      unit={unit}
      error={activeError}
      helperText={helperText}
      classNames={classNames}
      className={className}
      variant={variant}
      disabled={!!disabled}
      htmlFor={inputId}
      messageId={messageId}
      hideLegend={isFloating}
      borderActions={
        borderActions?.length ? (
          <FancyActions
            actions={borderActions}
            onBorder
            appearance={actionAppearance}
            disabled={disabled}
          />
        ) : undefined
      }
    >
      {/* Floating mode: one label that rises from inside the field into the border. Its
          background masks the border to cut the notch. */}
      {label && isFloating && (
        <label
          htmlFor={inputId}
          className={cn(
            'pointer-events-none absolute z-10 rounded-sm bg-white px-1 text-sm leading-none transition-[transform,color] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-transform',
            multiline ? 'top-[1.15rem]' : 'top-1/2',
            labelPosition === 'left'
              ? 'start-2 ltr:origin-left rtl:origin-right'
              : 'end-2 ltr:origin-right rtl:origin-left',
            labelIsUp
              ? multiline
                ? 'translate-y-[calc(-50%-1.05rem)] scale-[0.82]'
                : 'translate-y-[calc(-50%-1.2rem)] scale-[0.82]'
              : '-translate-y-1/2 scale-100',
            tone === 'error' && 'text-destructive',
            tone === 'success' && 'text-green-main',
            tone === 'warning' && 'text-warning',
            tone === 'info' && 'text-primary-5',
            tone === 'default' && (focused ? 'text-primary-8' : 'text-neutral-4'),
            classNames?.legend
          )}
        >
          {label}
          {unit && <> ({unit})</>}
        </label>
      )}

      <div className={cn('flex gap-1 pe-1', multiline ? 'items-start' : 'items-center')}>
        {multiline ? (
          <textarea
            ref={ref as Ref<HTMLTextAreaElement>}
            rows={rows}
            className={cn(fieldClassName, 'resize-y leading-relaxed')}
            {...fieldProps}
          />
        ) : (
          <input ref={ref as Ref<HTMLInputElement>} className={fieldClassName} {...fieldProps} />
        )}
        {!!actions?.length && (
          <div className={cn('flex items-center gap-0.5', classNames?.actions)}>
            <FancyActions actions={actions} appearance={actionAppearance} disabled={disabled} />
          </div>
        )}
      </div>

      {children && (
        <div
          className={cn('flex flex-col gap-2 border-t border-neutral-2 p-2', classNames?.children)}
        >
          {children}
        </div>
      )}
    </FancyField>
  );
}

export type FancyNumberInputProps = Omit<
  FancyInputProps,
  'value' | 'defaultValue' | 'onChange' | 'onValueChange'
> & {
  value: number | null;
  onValueChange: (value: number | null) => void;
};

/** A FancyInput holding a number, or null when empty. Half-typed numbers (`-`, `1.`) survive. */
export function FancyNumberInput({
  value,
  onValueChange,
  onBlur,
  ...props
}: FancyNumberInputProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const parses = (raw: string) => raw.trim() === '' || Number.isFinite(Number(raw));

  return (
    <FancyInput
      inputMode="decimal"
      validate="number"
      {...props}
      value={draft ?? (value === null ? '' : String(value))}
      onChange={(e) => {
        const raw = e.target.value;
        setDraft(raw);
        if (raw.trim() === '') onValueChange(null);
        else if (parses(raw)) onValueChange(Number(raw));
      }}
      onBlur={(e) => {
        // Unparseable text stays visible next to its error instead of snapping back.
        if (draft !== null && parses(draft)) setDraft(null);
        onBlur?.(e);
      }}
    />
  );
}

export {
  FANCY_BORDER_BUTTON,
  FancyChevron,
  type FancyChrome,
  FancyField,
  type FancyFieldClassNames,
  FancyIconGroup,
  FancyInfo,
  type FancyLabelPosition,
  type FancyVariant,
} from '@/ui/molecules/fancy-input/field';

export {
  type Validate,
  type ValidationKeyword,
  type ValidationResult,
  type ValidationRules,
  validateValue,
} from './validation';

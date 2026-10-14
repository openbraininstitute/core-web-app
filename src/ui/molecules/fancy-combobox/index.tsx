'use client';

import { CheckOutlined, CloseOutlined, LoadingOutlined, SearchOutlined } from '@ant-design/icons';
import { type ReactNode, useEffect, useId, useRef, useState } from 'react';

import {
  FancyChevron,
  type FancyChrome,
  FancyField,
  type FancyVariant,
} from '@/ui/molecules/fancy-input';
import { Popover, PopoverContent, PopoverTrigger } from '@/ui/molecules/popover';
import { cn } from '@/utils/css-class';

import type * as React from 'react';

export type FancyOption = {
  value: string;
  label: string;
  /** A mark before the label. */
  icon?: ReactNode;
  /** Listed but not selectable; pair it with a `note` saying why. */
  disabled?: boolean;
  /** A short fact at the end of the row: a count, a state, why it is disabled. */
  note?: string;
};

export type FancyComboboxProps = FancyChrome & {
  variant?: FancyVariant;
  /** Field-level buttons on the top border, before the info icon. */
  borderActions?: ReactNode;
  options: ReadonlyArray<FancyOption>;
  /** The chosen values; at most one unless `multiple`. */
  values: ReadonlyArray<string>;
  onChange: (next: Array<string>) => void;
  /** @default false */
  multiple?: boolean;
  placeholder?: string;
  /** Whether the panel has a search box. @default true above six options */
  searchable?: boolean;
  searchPlaceholder?: string;
  emptyLabel?: string;
  /** How many chosen values show as badges before the rest collapse into a count. @default 2 */
  maxBadges?: number;
  removeLabel?: (label: string) => string;
  disabled?: boolean;
  loading?: boolean;
  /** Replaces an option's label in the panel. */
  renderOption?: (option: FancyOption, selected: boolean) => ReactNode;
  /** Replaces a chosen value's label in the field. */
  renderValue?: (option: FancyOption) => ReactNode;
  className?: string;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onChange' | 'value' | 'className'>;

const SEARCHABLE_FROM = 6;

export function FancyCombobox({
  options,
  values,
  onChange,
  multiple = false,
  label,
  labelPosition,
  labelInfo,
  unit,
  variant,
  borderActions,
  helperText,
  placeholder = 'Select…',
  searchable,
  searchPlaceholder = 'Search…',
  emptyLabel = 'Nothing matches that.',
  maxBadges = 2,
  removeLabel = (one) => `Remove ${one}`,
  disabled = false,
  loading = false,
  error,
  renderOption,
  renderValue,
  classNames,
  className,
  ...triggerProps
}: FancyComboboxProps) {
  const id = useId();
  const labelId = `${id}-label`;
  const valueId = `${id}-value`;
  const listId = `${id}-list`;
  const messageId = `${id}-message`;
  const optionId = (index: number) => `${id}-option-${index}`;

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(-1);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const offersSearch = searchable ?? options.length > SEARCHABLE_FROM;
  const needle = query.trim().toLowerCase();
  const visible = needle
    ? options.filter((option) => option.label.toLowerCase().includes(needle))
    : options;
  const chosen = options.filter((option) => values.includes(option.value));
  const shown = chosen.slice(0, maxBadges);
  const hidden = chosen.length - shown.length;

  useEffect(() => {
    if (active >= 0)
      document.getElementById(optionId(active))?.scrollIntoView({ block: 'nearest' });
  });

  const changeOpen = (next: boolean) => {
    setOpen(next);
    setQuery('');
    if (next) {
      const selected = options.findIndex((option) => values.includes(option.value));
      setActive(selected >= 0 ? selected : options.findIndex((option) => !option.disabled));
    }
  };

  const pick = (option: FancyOption | undefined) => {
    if (!option || option.disabled) return;
    if (!multiple) {
      if (!values.includes(option.value)) onChange([option.value]);
      setOpen(false);
      return;
    }
    onChange(
      values.includes(option.value)
        ? values.filter((one) => one !== option.value)
        : [...values, option.value]
    );
  };

  const move = (from: number, step: 1 | -1) => {
    for (let i = 1; i <= visible.length; i += 1) {
      const next = (from + step * i + visible.length) % visible.length;
      if (!visible[next]?.disabled) return next;
    }
    return -1;
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const keys: Record<string, () => void> = {
      ArrowDown: () => setActive((current) => move(current, 1)),
      ArrowUp: () => setActive((current) => move(current < 0 ? 0 : current, -1)),
      Home: () => setActive(move(-1, 1)),
      End: () => setActive(move(0, -1)),
      Enter: () => pick(visible[active]),
    };
    // Space toggles from the list, but types a space in the search box.
    if (e.key === ' ' && e.target === listRef.current) keys[' '] = keys.Enter;
    const handler = keys[e.key];
    if (!handler) return;
    e.preventDefault();
    handler();
  };

  return (
    <FancyField
      label={label}
      labelPosition={labelPosition}
      labelInfo={labelInfo}
      unit={unit}
      variant={variant}
      borderActions={borderActions}
      error={error}
      helperText={helperText}
      classNames={classNames}
      className={className}
      disabled={disabled}
      active={open}
      labelId={labelId}
      messageId={messageId}
    >
      <Popover open={open} onOpenChange={changeOpen}>
        <div className="relative flex min-h-9 items-center gap-2 py-1 ps-2.5 pe-2">
          {/* The trigger covers the field; badges sit above it so their remove buttons stay
                real buttons instead of buttons nested in a button. */}
          <PopoverTrigger asChild>
            <button
              type="button"
              role="combobox"
              aria-haspopup="listbox"
              aria-expanded={open}
              aria-controls={listId}
              aria-labelledby={label ? `${labelId} ${valueId}` : valueId}
              aria-invalid={!!error}
              aria-describedby={error || helperText ? messageId : undefined}
              disabled={disabled}
              className={cn(
                'absolute inset-0 cursor-pointer rounded-lg outline-none disabled:cursor-not-allowed',
                classNames?.trigger
              )}
              {...triggerProps}
            />
          </PopoverTrigger>

          <span
            id={valueId}
            className="pointer-events-none relative flex min-w-0 flex-1 flex-wrap items-center gap-1"
          >
            {chosen.length === 0 ? (
              <span className="truncate py-0.5 text-sm text-neutral-3">{placeholder}</span>
            ) : !multiple ? (
              <span className="truncate py-0.5 text-sm text-primary-9">
                {renderValue ? renderValue(chosen[0]) : chosen[0].label}
              </span>
            ) : (
              <>
                {shown.map((option) => (
                  <span
                    key={option.value}
                    className="inline-flex max-w-full items-center gap-1 rounded-full bg-primary-0 py-0.5 ps-2 pe-1 text-xs font-semibold text-primary-8"
                  >
                    <span className="min-w-0 truncate">
                      {renderValue ? renderValue(option) : option.label}
                    </span>
                    {!disabled && (
                      <button
                        type="button"
                        aria-label={removeLabel(option.label)}
                        className="pointer-events-auto grid size-4 shrink-0 cursor-pointer place-items-center rounded-full text-[8px] text-primary-8/70 transition-colors hover:bg-primary-1 hover:text-primary-8"
                        onClick={() => onChange(values.filter((one) => one !== option.value))}
                      >
                        <CloseOutlined />
                      </button>
                    )}
                  </span>
                ))}
                {hidden > 0 && (
                  <span
                    className="inline-flex items-center rounded-full bg-primary-8 px-2 py-0.5 text-xs font-bold text-white"
                    title={chosen
                      .slice(maxBadges)
                      .map((option) => option.label)
                      .join(', ')}
                  >
                    +{hidden}
                  </span>
                )}
              </>
            )}
          </span>

          <span
            aria-hidden
            className="pointer-events-none relative flex items-center text-xs text-neutral-4"
          >
            {loading ? <LoadingOutlined spin /> : <FancyChevron open={open} />}
          </span>
        </div>

        <PopoverContent
          align="start"
          sideOffset={6}
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            (searchRef.current ?? listRef.current)?.focus({ preventScroll: true });
          }}
          onKeyDown={onKeyDown}
          className={cn(
            'w-(--radix-popover-trigger-width) min-w-48 overflow-hidden rounded-lg border-neutral-2 bg-white p-0 shadow-lg',
            'transition-[opacity,translate] duration-150 ease-out starting:-translate-y-1 starting:opacity-0',
            classNames?.panel
          )}
        >
          {offersSearch && (
            <div className="flex items-center gap-2 border-b border-neutral-2 px-2.5">
              <SearchOutlined className="text-neutral-4" />
              <input
                ref={searchRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActive(0);
                }}
                placeholder={searchPlaceholder}
                aria-label={searchPlaceholder}
                aria-controls={listId}
                aria-activedescendant={active >= 0 ? optionId(active) : undefined}
                autoComplete="off"
                className="h-9 w-full min-w-0 bg-transparent text-sm text-primary-9 outline-none placeholder:text-neutral-3"
              />
            </div>
          )}
          <div
            ref={listRef}
            id={listId}
            role="listbox"
            tabIndex={-1}
            aria-label={label ?? placeholder}
            aria-multiselectable={multiple || undefined}
            aria-activedescendant={active >= 0 ? optionId(active) : undefined}
            className="max-h-64 overflow-y-auto overscroll-contain p-1 outline-none"
          >
            {loading && visible.length === 0 ? (
              <div className="flex items-center justify-center gap-2 py-6 text-sm text-neutral-4">
                <LoadingOutlined spin /> Loading…
              </div>
            ) : visible.length === 0 ? (
              <div role="status" className="px-3 py-6 text-center text-sm text-neutral-4">
                {emptyLabel}
              </div>
            ) : (
              visible.map((option, index) => {
                const selected = values.includes(option.value);
                return (
                  // biome-ignore lint/a11y: options are reached through the listbox aria-activedescendant, not focus
                  <div
                    key={option.value}
                    id={optionId(index)}
                    role="option"
                    aria-selected={selected}
                    aria-disabled={option.disabled || undefined}
                    onPointerMove={() => !option.disabled && setActive(index)}
                    onClick={() => pick(option)}
                    className={cn(
                      'flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors',
                      index === active && 'bg-primary-0',
                      selected ? 'font-semibold text-primary-8' : 'text-primary-9',
                      option.disabled && 'cursor-not-allowed opacity-45'
                    )}
                  >
                    {multiple && (
                      <span
                        aria-hidden
                        className={cn(
                          'grid size-4 shrink-0 place-items-center rounded-[5px] border text-[9px] transition-colors',
                          selected
                            ? 'border-primary-8 bg-primary-8 text-white'
                            : 'border-neutral-3 bg-white'
                        )}
                      >
                        {selected && <CheckOutlined />}
                      </span>
                    )}
                    {option.icon && <span className="shrink-0">{option.icon}</span>}
                    <span className="min-w-0 flex-1 truncate">
                      {renderOption ? renderOption(option, selected) : option.label}
                    </span>
                    {option.note && (
                      <span className="shrink-0 ps-2 text-xs text-neutral-4">{option.note}</span>
                    )}
                    {!multiple && selected && <CheckOutlined className="text-xs" />}
                  </div>
                );
              })
            )}
          </div>
        </PopoverContent>
      </Popover>
    </FancyField>
  );
}

/** FancyCombobox that holds several values. */
export function FancyMultiSelect(props: Omit<FancyComboboxProps, 'multiple'>) {
  return <FancyCombobox {...props} multiple />;
}

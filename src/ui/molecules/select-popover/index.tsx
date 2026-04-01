import { CheckOutlined, CloseOutlined, DownOutlined, SearchOutlined } from '@ant-design/icons';
import { useVirtualizer } from '@tanstack/react-virtual';
import { type ComponentProps, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useDefaultBreakpoint } from '@/ui/hooks/create-break-point';
import { Button } from '@/ui/molecules/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/ui/molecules/popover';
import { cn } from '@/utils/css-class';

export type SelectPopoverOption<T = unknown> = {
  value: string;
  label: string;
  data?: T;
};

export type SelectPopoverLayout = 'popover' | 'inline';

export type SelectPopoverProps<T = unknown> = {
  options: Array<SelectPopoverOption<T>>;
  placeholder?: string;
  searchPlaceholder?: string;
  onSelect?: (option: SelectPopoverOption<T> | undefined) => void;
  selectedValue?: string;
  searchable?: boolean;
  /** `inline`: list expands below the trigger in the document flow (scrollable). `popover`: portaled overlay (default). */
  layout?: SelectPopoverLayout;
  clsx?: {
    trigger?: ComponentProps<'div'>['className'];
    content?: ComponentProps<'div'>['className'];
    /** Outer wrapper when `layout="inline"`. */
    inlineContainer?: ComponentProps<'div'>['className'];
    rowClassName?: (option: SelectPopoverOption<T>) => ComponentProps<'div'>['className'];
    label?: ComponentProps<'div'>['className'];
  };
};

const triggerBaseClassName = cn(
  'text-primary-9 border-neutral-2 hover:border-primary-9 active:bg-primary-9 hover:text-primary-8 border bg-white shadow-xs hover:border-2',
  'text-md active:text-primary-9 active:border-primary-9 h-full flex-1 gap-1.5 rounded-md pr-3 pl-5 active:bg-white',
  'group flex w-full grow justify-between self-stretch'
);

export function SelectPopover<T = unknown>({
  options,
  placeholder = 'Select option...',
  searchPlaceholder = 'Search...',
  onSelect,
  selectedValue,
  searchable,
  layout = 'popover',
  clsx,
}: SelectPopoverProps<T>) {
  const breakpoint = useDefaultBreakpoint();
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [parent, setParent] = useState<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredOptions = useMemo(() => {
    if (!searchTerm) return options;
    return options.filter((option) =>
      option.label.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [options, searchTerm]);

  const parentSetter = useCallback((el: HTMLDivElement) => {
    setParent(el);
  }, []);

  const rowVirtualizer = useVirtualizer({
    count: filteredOptions.length,
    enabled: open && filteredOptions.length > 0 && !!parent,
    useAnimationFrameWithResizeObserver: true,
    getScrollElement: () => parent,
    estimateSize: () => 40,
    overscan: 5,
    paddingEnd: 10,
  });

  const handleSelect = useCallback(
    (option: SelectPopoverOption<T> | undefined) => {
      onSelect?.(option);
      setOpen(false);
      setSearchTerm('');
    },
    [onSelect]
  );

  const handleOpenChange = useCallback((newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      setSearchTerm('');
    }
  }, []);

  useEffect(() => {
    if (layout !== 'inline' || !open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setSearchTerm('');
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [layout, open]);

  useEffect(() => {
    if (layout !== 'inline' || !open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        setSearchTerm('');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [layout, open]);

  const selectedOption = options.find((option) => option?.value === selectedValue);

  const searchField = searchable ? (
    <div className="border-neutral-2 shrink-0 border-b bg-white p-2">
      <div data-slot="command-input-wrapper" className={cn('flex h-9 items-center gap-2 px-3')}>
        <SearchOutlined className="size-4 shrink-0 opacity-50" />
        <input
          placeholder={searchPlaceholder}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={cn(
            'border-none',
            'placeholder:text-muted-foreground flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-hidden disabled:cursor-not-allowed disabled:opacity-50',
            { 'h-9 text-base': breakpoint === 'l' },
            { 'h-10 text-lg': breakpoint === 'xl' }
          )}
        />
      </div>
    </div>
  ) : null;

  const listScrollClassName =
    layout === 'inline'
      ? 'max-h-80 min-h-0 w-full shrink-0 overflow-y-auto'
      : 'h-full max-h-80 w-full overflow-auto';

  const optionsBody =
    filteredOptions.length === 0 ? (
      <div className="flex w-full items-center justify-center py-8">
        <span className="text-neutral-4 text-sm">
          {searchTerm ? 'No results found' : 'No options available'}
        </span>
      </div>
    ) : (
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualItem) => {
          const option = filteredOptions[virtualItem.index];
          if (!option) return null;

          const { value, label } = option;
          const isSelected = value === selectedValue;

          return (
            <div
              key={option?.value}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualItem.size}px`,
                transform: `translateY(${virtualItem.start}px)`,
              }}
              className="group mb-1 flex items-center justify-start"
            >
              <button
                type="button"
                aria-label={label}
                onClick={() => handleSelect(option)}
                className={cn(
                  'text-primary-9 hover:bg-background flex h-full w-full cursor-pointer items-center justify-start px-3 text-left',
                  'group-first:hover:rounded-t-md',
                  { 'text-base': breakpoint === 'l' },
                  { 'text-lg': breakpoint === 'xl' },
                  clsx?.rowClassName?.(option)
                )}
                title={label}
              >
                <span className="line-clamp-2 w-full">{label}</span>
                <CheckOutlined
                  className={cn('ml-auto text-sm', isSelected ? 'opacity-100' : 'opacity-0')}
                />
              </button>
            </div>
          );
        })}
      </div>
    );

  const triggerClassName = cn(
    triggerBaseClassName,
    layout === 'inline' && '!border-none !shadow-none hover:!border-none active:!border-none',
    layout === 'inline' && (open ? 'rounded-t-2xl rounded-b-none' : 'rounded-full'),
    clsx?.trigger
  );

  const triggerInner = (
    <>
      <div
        className={cn('line-clamp-1 w-full truncate text-left', clsx?.label, {
          'text-neutral-2 placeholder:text-sm': !selectedOption?.label,
        })}
      >
        {selectedOption?.label || placeholder}
      </div>
      {selectedValue ? (
        // biome-ignore lint/a11y/useSemanticElements: must not nest <button> inside the combobox trigger <button>
        <div
          role="button"
          className="group-hover:bg-neutral-1 group-hover:text-primary-8 flex cursor-pointer items-center justify-center rounded-full p-1"
          tabIndex={-1}
          onKeyDown={(e) => {
            e.stopPropagation();
            handleSelect(undefined);
          }}
          onClick={(e) => {
            e.stopPropagation();
            handleSelect(undefined);
          }}
        >
          <CloseOutlined className="opacity-50 [&_svg]:size-3!" />
        </div>
      ) : (
        <div className="group-hover:bg-neutral-1 group-hover:text-primary-8 flex cursor-pointer items-center justify-center rounded-full p-1">
          <DownOutlined className="opacity-50 [&_svg]:size-3!" />
        </div>
      )}
    </>
  );

  if (layout === 'inline') {
    return (
      <div
        ref={containerRef}
        className={cn(
          'flex w-full flex-col',
          clsx?.inlineContainer,
          open ? 'rounded-2xl' : 'rounded-full'
        )}
      >
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          type="button"
          onClick={() => setOpen((o) => !o)}
          className={cn(triggerClassName, 'select-none')}
        >
          {triggerInner}
        </Button>
        {open ? (
          <div className="flex min-h-0 w-full flex-col">
            {searchField}
            <div
              id="select-popover-dropdown-parent-inline"
              ref={parentSetter}
              className={cn('border-neutral-2 bg-white border-t', listScrollClassName)}
            >
              {optionsBody}
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild className={cn(triggerBaseClassName, clsx?.trigger)}>
        <Button variant="outline" role="combobox" className="select-none">
          {triggerInner}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className={cn('border-neutral-2 bg-white p-0 shadow-md', clsx?.content)}
        style={{
          width: 'var(--radix-popover-trigger-width)',
        }}
      >
        {searchField}
        <div id="select-popover-dropdown-parent" ref={parentSetter} className={listScrollClassName}>
          {optionsBody}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function SelectPopoverFormItem<T = unknown>({
  options,
  placeholder = 'Select option...',
  searchPlaceholder = 'Search...',
  onSelect,
  searchable = false,
  layout,
  clsx,
}: SelectPopoverProps<T>) {
  return function Wrapper({
    value,
    onChange,
  }: {
    value?: string;
    onChange?: (value: string | undefined) => void;
  }) {
    return (
      <SelectPopover
        options={options}
        placeholder={placeholder}
        searchPlaceholder={searchPlaceholder}
        onSelect={(option) => {
          onSelect?.(option);
          onChange?.(option?.value);
        }}
        searchable={searchable}
        layout={layout}
        selectedValue={value}
        clsx={clsx}
      />
    );
  };
}

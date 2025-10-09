import { ComponentProps, useCallback, useMemo, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  CheckOutlined,
  CloseOutlined,
  DownOutlined,
  LoadingOutlined,
  SearchOutlined,
} from '@ant-design/icons';

import { Popover, PopoverContent, PopoverTrigger } from '@/ui/molecules/popover';
import { useDefaultBreakpoint } from '@/ui/hooks/create-break-point';
import { Button } from '@/ui/molecules/button';
import { cn } from '@/utils/css-class';

export type SelectPopoverOption<T = unknown> = {
  value: string;
  label: string;
  data?: T;
};

export type SelectPopoverProps<T = unknown> = {
  options: Array<SelectPopoverOption<T>>;
  placeholder?: string;
  searchPlaceholder?: string;
  onSelect?: (option: SelectPopoverOption<T> | undefined) => void;
  selectedValue?: string;
  searchable?: boolean;
  clsx?: {
    trigger?: ComponentProps<'div'>['className'];
    content?: ComponentProps<'div'>['className'];
    rowClassName?: (option: SelectPopoverOption<T>) => ComponentProps<'div'>['className'];
  };
};

export function SelectPopover<T = unknown>({
  options,
  placeholder = 'Select option...',
  searchPlaceholder = 'Search...',
  onSelect,
  selectedValue,
  searchable,
  clsx,
}: SelectPopoverProps<T>) {
  const breakpoint = useDefaultBreakpoint();
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [parent, setParent] = useState<HTMLDivElement | null>(null);

  const filteredOptions = useMemo(() => {
    if (!searchTerm) return options;
    return options.filter((option) =>
      option.label.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [options, searchTerm]);

  const parentSetter = useCallback(
    (el: HTMLDivElement) => {
      setParent(el);
    },
    [setParent]
  );

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
    },
    [onSelect]
  );

  const handleOpenChange = useCallback((newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      setSearchTerm('');
    }
  }, []);

  const selectedOption = options.find((option) => option?.value === selectedValue);

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        asChild
        className={cn(
          'text-primary-9 border-neutral-2 hover:border-primary-9 active:bg-primary-9 hover:text-primary-8 border bg-white shadow-xs hover:border-2',
          'text-md active:text-primary-9 active:border-primary-9 h-full flex-1 gap-1.5 rounded-md pr-3 pl-5 active:bg-white',
          'group flex w-full grow justify-between self-stretch',
          clsx?.trigger
        )}
      >
        <Button variant="outline" role="combobox" className="select-none">
          <div className="line-clamp-1 w-full truncate text-left">
            {selectedOption?.label || placeholder}
          </div>
          {selectedValue ? (
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
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className={cn('border-neutral-2 bg-white p-0 shadow-md', clsx?.content)}
        style={{
          width: 'var(--radix-popover-trigger-width)',
        }}
      >
        {searchable && (
          <div className="border-neutral-2 border-b p-2">
            <div
              data-slot="command-input-wrapper"
              className={cn('flex h-9 items-center gap-2 px-3')}
            >
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
        )}

        <div
          id="select-popover-dropdown-parent"
          ref={parentSetter}
          className="h-full max-h-80 w-full overflow-auto"
        >
          {/* eslint-disable-next-line no-nested-ternary */}
          {filteredOptions.length === 0 ? (
            <div className="flex h-full w-full items-center justify-center py-5">
              <LoadingOutlined className="text-neutral-4" spin />
            </div>
          ) : filteredOptions.length === 0 ? (
            <div className="flex h-full w-full items-center justify-center py-5">
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
          )}
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
        selectedValue={value}
        clsx={clsx}
      />
    );
  };
}

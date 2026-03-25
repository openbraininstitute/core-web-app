import {
  CheckOutlined,
  CloseOutlined,
  DownOutlined,
  InfoCircleFilled,
  LoadingOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useDefaultBreakpoint } from '@/ui/hooks/create-break-point';
import { Popover, PopoverContent, PopoverTrigger } from '@/ui/molecules/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/molecules/tooltip';
import { cn } from '@/utils/css-class';

import type { ComponentProps } from 'react';
import type { PaginationFilter, SearchFilter } from '@/api/entitycore/types/shared/request';
import type { EntityCoreResponse } from '@/api/entitycore/types/shared/response';

function SkeletonLoader({ count = 5 }: { count?: number }) {
  const delays = Array.from({ length: count }, (_, index) => index * 100);

  return (
    <div className="space-y-2 p-2">
      {delays.map((delay) => (
        <div
          key={`select-skeleton-${delay}`}
          className={cn(
            'from-neutral-1 via-neutral-2 to-neutral-1 animate-shimmer',
            'relative h-10 overflow-hidden rounded-md bg-gradient-to-r bg-[length:200%_100%]'
          )}
          style={{
            animationDelay: `${delay}ms`,
          }}
        />
      ))}
    </div>
  );
}

export type AsyncSelectOption<T = unknown> = {
  value: string;
  label: string;
  data: T;
};

export type AsyncSelectQueryFn<
  R extends Partial<PaginationFilter & SearchFilter>,
  T = unknown,
> = (params: { filters: R; search?: string }) => Promise<EntityCoreResponse<T>>;

export type AsyncSelectProps<R extends Partial<PaginationFilter & SearchFilter>, T = unknown> = {
  id?: string;
  ariaLabel?: string;
  dataKey: Array<string> | Array<string | Record<string, unknown>>;
  queryFn: AsyncSelectQueryFn<R, T>;
  getOptionLabel: (item: T) => string;
  getOptionValue: (item: T) => string;
  placeholder?: string;
  searchPlaceholder?: string;
  onSelect?: (option: AsyncSelectOption<T> | undefined) => void;
  selectedValue?: string;
  selectedLabel?: string;
  searchField?: string;
  searchable: boolean;
  disabled?: boolean;
  clsx?: {
    trigger?: ComponentProps<'div'>['className'];
    content?: ComponentProps<'div'>['className'];
    label?: ComponentProps<'div'>['className'];
  };
  tooltip?: ((data: T) => React.ReactNode) | null;
  customItemRender?:
    | ((props: {
        data: AsyncSelectOption<T>;
        selected: boolean;
        onSelect: (option: AsyncSelectOption<T> | undefined) => void;
      }) => React.ReactNode)
    | null;
};

export function AsyncSelect<R extends Partial<PaginationFilter & SearchFilter>, T = unknown>({
  id,
  ariaLabel,
  dataKey,
  queryFn,
  getOptionLabel,
  getOptionValue,
  placeholder = 'Select option...',
  searchPlaceholder = 'Search...',
  onSelect,
  selectedValue,
  selectedLabel,
  searchField,
  searchable,
  disabled = false,
  tooltip,
  customItemRender,
  clsx,
}: AsyncSelectProps<R, T>) {
  const breakpoint = useDefaultBreakpoint();
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [parent, setParent] = useState<HTMLDivElement | null>(null);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isFetching } =
    useInfiniteQuery({
      queryKey: [...dataKey, { searchTerm }],
      queryFn: ({ pageParam = 1 }) =>
        queryFn({
          filters: {
            page: pageParam,
            page_size: 10,
            ...(searchField && searchTerm.trim() !== '' ? { [searchField]: searchTerm } : {}),
          } as R,
        }),
      getNextPageParam: (lastPage, pages) => {
        const hasNext =
          lastPage.pagination.page * lastPage.pagination.page_size <
          lastPage.pagination.total_items;
        return hasNext ? pages.length + 1 : undefined;
      },
      initialPageParam: 1,
    });

  const allItems = useMemo(() => {
    return data?.pages.flatMap((page) => page.data) ?? [];
  }, [data]);

  const options = useMemo<Array<AsyncSelectOption<T>>>(() => {
    return allItems.map((item) => ({
      value: getOptionValue(item),
      label: getOptionLabel(item),
      data: item,
    }));
  }, [allItems, getOptionLabel, getOptionValue]);

  // persist seen options across searches/pages so we can still display the
  // selected label even if it is not present in the current options list.
  const persistedOptionsRef = useRef<Map<string, AsyncSelectOption<T>> | null>(
    new Map<string, AsyncSelectOption<T>>()
  );

  const currentOptionsMap = useMemo<Map<string, AsyncSelectOption<T>>>(() => {
    const next = new Map<string, AsyncSelectOption<T>>();
    for (const option of options) {
      next.set(option.value, option);
    }
    return next;
  }, [options]);

  useEffect(() => {
    if (options.length === 0) return;
    if (persistedOptionsRef.current) {
      const cache = persistedOptionsRef.current;
      options.forEach((opt) => {
        cache.set(opt.value, opt);
      });
    }
  }, [options]);

  const selectedOptionFromProps = useMemo<AsyncSelectOption<T> | undefined>(() => {
    if (!selectedValue) return undefined;
    return currentOptionsMap.get(selectedValue) ?? persistedOptionsRef.current?.get(selectedValue);
  }, [currentOptionsMap, selectedValue]);
  const selectedText =
    selectedOptionFromProps?.label ?? (selectedValue ? selectedLabel : undefined);

  const parentSetter = useCallback((el: HTMLDivElement | null) => {
    setParent(el);
  }, []);

  useEffect(() => {
    if (!open || !parent) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = parent;
      const isNearBottom = scrollTop + clientHeight >= scrollHeight - 100;

      if (isNearBottom && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    };

    parent.addEventListener('scroll', handleScroll);
    return () => parent.removeEventListener('scroll', handleScroll);
  }, [open, parent, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleSelect = useCallback(
    (option: AsyncSelectOption<T> | undefined) => {
      if (option) persistedOptionsRef.current?.set(option.value, option);
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

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        asChild
        className={cn(
          'text-primary-9 border-neutral-2 hover:border-primary-9 active:bg-primary-9',
          'hover:text-primary-8 border bg-white shadow-xs hover:border-2',
          'text-md active:border-primary-9 h-full flex-1 gap-1.5 rounded-md pr-3 pl-5 active:bg-white',
          'group flex w-full grow justify-between self-stretch',
          clsx?.trigger
        )}
      >
        <button
          type="button"
          role="combobox"
          aria-label={ariaLabel}
          aria-expanded={open}
          disabled={disabled || isLoading}
          className="select-none dropdown-item flex items-center justify-between"
        >
          <div
            id={`async-select-label-${id}`}
            className={cn('line-clamp-1 w-full truncate text-left', clsx?.label, {
              'text-neutral-2 placeholder:text-sm': !selectedText,
            })}
          >
            {selectedText || placeholder}
          </div>
          {/* eslint-disable-next-line no-nested-ternary */}
          {isLoading || isFetching ? (
            <LoadingOutlined className="opacity-50 [&_svg]:size-3!" spin />
          ) : selectedValue ? (
            // biome-ignore lint/a11y/useSemanticElements: the clear affordance lives inside the popover trigger, so a nested button would be invalid markup.
            <span
              role="button"
              aria-label="Clear selection"
              tabIndex={-1}
              className={cn(
                'group-hover:bg-neutral-1 group-hover:text-primary-8',
                'flex cursor-pointer items-center justify-center rounded-full p-1'
              )}
              onKeyDown={(event) => {
                if (event.key !== 'Enter' && event.key !== ' ') {
                  return;
                }

                event.preventDefault();
                event.stopPropagation();
                handleSelect(undefined);
              }}
              onClick={(e) => {
                e.stopPropagation();
                handleSelect(undefined);
              }}
            >
              <CloseOutlined className="opacity-50 [&_svg]:size-3!" />
            </span>
          ) : (
            <div
              className={cn(
                'group-hover:bg-neutral-1 group-hover:text-primary-8 size-5! min-w-5!',
                'flex cursor-pointer items-center justify-center rounded-full p-1'
              )}
            >
              <DownOutlined className="opacity-50 [&_svg]:size-3!" />
            </div>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        id={id}
        className={cn(
          'border-neutral-2 bg-white p-0 shadow-md transition-all duration-150',
          clsx?.content
        )}
        style={{
          width: 'var(--radix-popover-trigger-width)',
        }}
      >
        {searchable && !!searchField && (
          <div className="border-neutral-2 border-b p-2">
            <div
              data-slot="command-input-wrapper"
              className={cn(
                'focus-within:bg-neutral-0.5 flex h-9 items-center gap-2 rounded-md px-3 transition-colors duration-200'
              )}
            >
              <SearchOutlined className="text-primary-8 size-4 shrink-0 transition-opacity duration-200" />
              <input
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={cn(
                  'outline-hidden transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50',
                  'placeholder:text-label flex h-10 w-full rounded-md bg-transparent py-3 text-sm',
                  'border-none',
                  { 'h-9 text-base': breakpoint === 'l' },
                  { 'h-10 text-lg': breakpoint === 'xl' }
                )}
              />
            </div>
          </div>
        )}

        <div
          id={`${dataKey}-dropdown-parent`}
          ref={parentSetter}
          className="relative h-full max-h-80 w-full overflow-auto scroll-smooth"
        >
          {/* eslint-disable-next-line no-nested-ternary */}
          {isLoading && options.length === 0 ? (
            <SkeletonLoader count={5} />
          ) : options.length === 0 ? (
            <div className="flex h-full w-full items-center justify-center py-5">
              <span className="text-neutral-4 text-sm">No results found</span>
            </div>
          ) : (
            options.map((option, ind) => {
              if (!option) return null;

              const { value, label, data: optionData } = option;
              const isSelected = value === selectedValue;
              if (customItemRender) {
                return customItemRender({
                  data: option,
                  selected: isSelected,
                  onSelect: handleSelect,
                });
              }

              return (
                <div key={option?.value} className="group mb-1 flex items-center justify-start">
                  <button
                    type="button"
                    aria-label={label}
                    onClick={() => handleSelect(option)}
                    className={cn(
                      'text-primary-9 hover:bg-background flex h-full w-full cursor-pointer',
                      'items-center justify-start px-3 text-left transition-colors duration-150',
                      'group-first:hover:rounded-t-md',
                      { 'p-2 text-base': breakpoint === 'l' },
                      { 'p-3 text-lg': breakpoint === 'xl' },
                      { 'hover:rounded-b-md': ind === options.length - 1 },
                      { 'hover:rounded-t-md': ind === 0 }
                    )}
                    title={label}
                  >
                    <span className="line-clamp-2 w-full group-hover:font-black">{label}</span>
                    <div className="flex items-center justify-center gap-1">
                      <CheckOutlined
                        className={cn(
                          'ml-auto text-sm transition-opacity duration-200',
                          isSelected ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                      {tooltip && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="h-8 rounded-full border-none">
                              <InfoCircleFilled className="text-primary-8" />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent
                            avoidCollisions
                            align="end"
                            side="bottom"
                            sideOffset={-9}
                            collisionPadding={{ left: 0 }}
                            arrowPadding={0}
                            className="shadow-bnb bg-primary-9 z-[99999] text-white!"
                            arrowClassName="bg-primary-9"
                          >
                            {tooltip(optionData)}
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </button>
                </div>
              );
            })
          )}
          {isFetchingNextPage && (
            <div className="sticky bottom-0 left-0 z-[99999] flex items-center justify-center gap-2 py-3">
              <LoadingOutlined className="text-primary-8" spin />
              <span className="text-primary-8 text-sm font-medium">Loading next results...</span>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function AsyncSelectFormItem<
  R extends Partial<PaginationFilter & SearchFilter>,
  T = unknown,
>({
  id,
  dataKey,
  queryFn,
  getOptionLabel,
  getOptionValue,
  placeholder = 'Select option...',
  searchPlaceholder = 'Search...',
  onSelect,
  searchField,
  searchable = true,
  tooltip,
  clsx,
  customItemRender,
}: AsyncSelectProps<R, T>) {
  return function Wrapper({
    value,
    onChange,
  }: {
    value?: string;
    onChange?: (value: string | undefined) => void;
  }) {
    return (
      <AsyncSelect<R, T>
        id={id}
        dataKey={dataKey}
        queryFn={queryFn}
        getOptionLabel={getOptionLabel}
        getOptionValue={getOptionValue}
        placeholder={placeholder}
        searchPlaceholder={searchPlaceholder}
        onSelect={(option) => {
          onChange?.(option?.value);
          onSelect?.(option);
        }}
        searchField={searchField}
        selectedValue={value}
        searchable={searchable}
        clsx={clsx}
        tooltip={tooltip}
        customItemRender={customItemRender}
      />
    );
  };
}

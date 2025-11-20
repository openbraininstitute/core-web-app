import { CheckOutlined, DownOutlined, LoadingOutlined, SearchOutlined } from '@ant-design/icons';
import { ComponentProps, startTransition, useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { unwrap } from 'jotai/utils';
import { useAtomValue } from 'jotai';

import { brainRegionBasicCellGroupsRegionsHierarchyAtom } from '@/features/brain-region-hierarchy/context';
import { Popover, PopoverContent, PopoverTrigger } from '@/ui/molecules/popover';
import { useDefaultBreakpoint } from '@/ui/hooks/create-break-point';
import { Button } from '@/ui/molecules/button';
import { BrainIcon } from '@/components/icons';
import { cn } from '@/utils/css-class';

import type { BrainRegionHierarchyOption } from '@/features/brain-region-hierarchy/context';
import type { IBrainRegionHierarchy } from '@/api/entitycore/types/entities/brain-region';

type Props = {
  onSelectBrainRegion?: (br: IBrainRegionHierarchy) => void;
  clsx?: {
    trigger?: ComponentProps<'div'>['className'];
    content?: ComponentProps<'div'>['className'];
  };
  charsPerLine?: number;
  showIcon?: boolean;
  defaultBrainRegion?: IBrainRegionHierarchy;
};

export function BrainRegionDropdown({
  onSelectBrainRegion,
  charsPerLine = 25,
  clsx,
  showIcon = true,
  defaultBrainRegion,
}: Props) {
  const breakpoint = useDefaultBreakpoint();
  const brainRegionHierarchy = useAtomValue(
    useMemo(() => unwrap(brainRegionBasicCellGroupsRegionsHierarchyAtom), [])
  );
  const [selected, setSelected] = useState<BrainRegionHierarchyOption | undefined>(undefined);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (defaultBrainRegion && brainRegionHierarchy) {
      const defaultOption = brainRegionHierarchy.options.find(
        (o) => o.data?.id === defaultBrainRegion.id
      );
      if (defaultOption) {
        setSelected(defaultOption);
      }
    } else if (brainRegionHierarchy && !defaultBrainRegion && !selected) {
      setSelected(undefined);
    }
  }, [defaultBrainRegion, brainRegionHierarchy, selected]); 

  const filteredOptions = useMemo(() => {
    if (!brainRegionHierarchy) return [];
    if (!search) return brainRegionHierarchy.options;

    const lowerCaseSearch = search.toLowerCase();

    return brainRegionHierarchy.options.filter((option) =>
      (option.label || '').toLowerCase().includes(lowerCaseSearch)
    );
  }, [brainRegionHierarchy, search]);

  const onSelect = useCallback(
    (option: BrainRegionHierarchyOption) => {
      setSelected(option);
      setPopoverOpen(false);
      onSelectBrainRegion?.(option.data);
    },
    [onSelectBrainRegion]
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: filteredOptions.length,
    getScrollElement: () => containerRef.current,
    estimateSize: useCallback(() => 36, []), // All rows are 36px tall
    overscan: 5,
  });

  const items = virtualizer.getVirtualItems();

  const renderItem = useCallback(
    ({ data, selected: isSelected, onSelect: handleSelect }: BrainRegionHierarchyOption) => {
      const fullLabel = data.full_label || data.name;

      const indentedLabel =
        fullLabel.length > charsPerLine
          ? `${fullLabel.slice(0, charsPerLine)}...`
          : fullLabel;

      const indentation = data.depth * 8; // 8px per level

      return (
        <div key={data.id} className="group mb-1 flex items-center justify-start">
          <button
            type="button"
            aria-label={data.name}
            onClick={() => handleSelect({ data, selected: isSelected, onSelect: handleSelect })}
            className={cn(
              'text-primary-9 hover:bg-background flex h-full w-full cursor-pointer',
              'items-center justify-start px-3 text-left transition-colors duration-150',
              isSelected && 'bg-primary-9/10 hover:bg-primary-9/10'
            )}
          >
            <div
              className="truncate text-base font-light"
              style={{ paddingLeft: `${indentation}px` }}
            >
              {indentedLabel}
            </div>
            {isSelected && <CheckOutlined className="text-primary-9 ml-auto text-sm" />}
          </button>
        </div>
      );
    },
    [charsPerLine]
  );

  const trigger = useMemo(() => {
    const icon = selected ? (
      <BrainIcon className="text-primary-9 size-6" />
    ) : (
      <SearchOutlined className="text-primary-9 text-lg" />
    );

    const labelContent = selected?.label || 'Select a brain region...';

    return (
      <Button
        rounded
        variant="outline"
        size="lg"
        onClick={() => setPopoverOpen(true)}
        className={cn(
          'text-primary-9 border-primary-9 disabled:border-neutral-1 shadow-bnb w-full justify-between',
          'text-left active:text-white disabled:opacity-50',
          clsx?.trigger
        )}
      >
        <div className="flex flex-row items-center justify-start gap-2 truncate">
          {showIcon && icon}
          <div className="truncate text-base font-light">{labelContent}</div>
        </div>
        <DownOutlined className="text-primary-9 text-xs" />
      </Button>
    );
  }, [selected, clsx?.trigger, showIcon]);

  if (!brainRegionHierarchy) {
    return (
      <Button
        rounded
        variant="outline"
        size="lg"
        disabled
        className={cn(
          'text-primary-9 border-primary-9 disabled:border-neutral-1 shadow-bnb w-full justify-between',
          'text-left active:text-white disabled:opacity-50',
          clsx?.trigger
        )}
      >
        <div className="flex flex-row items-center justify-start gap-2 truncate">
          <LoadingOutlined className="text-primary-9 text-lg" />
          <div className="truncate text-base font-light">Loading brain regions...</div>
        </div>
        <DownOutlined className="text-primary-9 text-xs" />
      </Button>
    );
  }

  return (
    <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        className={cn(
          'bg-background p-0',
          breakpoint === 'lg' ? 'w-[400px]' : 'w-screen min-w-[300px]',
          clsx?.content
        )}
      >
        <div className="flex flex-col gap-2 p-2">
          <div className="relative">
            <SearchOutlined className="text-primary-9 absolute left-3 top-1/2 -translate-y-1/2 text-lg" />
            <input
              type="text"
              placeholder="Search brain regions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-background w-full rounded-full border border-neutral-3 py-3 pl-10 pr-4 text-base placeholder:text-neutral-5 focus:outline-none"
            />
          </div>
          {filteredOptions.length === 0 ? (
            <div className="text-center text-neutral-5 p-4">No results found.</div>
          ) : (
            <div
              ref={containerRef}
              className="scrollbar-hide overflow-y-auto"
              style={{ height: '300px' }}
            >
              <div
                style={{
                  height: virtualizer.getTotalSize(),
                  width: '100%',
                  position: 'relative',
                }}
              >
                {items.map((virtualRow) => {
                  const option = filteredOptions[virtualRow.index];
                  return (
                    <div
                      key={option.data.id}
                      data-index={virtualRow.index}
                      ref={virtualizer.measureElement}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: virtualRow.size,
                        transform: `translateY(${virtualRow.start}px)`,
                      }}
                    >
                      {renderItem({ ...option, selected: selected?.data.id === option.data.id, onSelect })}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function BrainRegionDropdownWithFormItem({
  onSelectBrainRegion,
  clsx,
  defaultBrainRegion,
  showIcon = true,
  charsPerLine = 200,
}: Props) {
  const brainRegionHierarchy = useAtomValue(
    useMemo(() => unwrap(brainRegionBasicCellGroupsRegionsHierarchyAtom), [])
  );

  const wrapper = useMemo(
    () =>
      function Wrapper({
        value,
        onChange,
      }: {
        value?: string;
        onChange?: (value: string) => void;
      }) {
        const handleSelectBrainRegion = useCallback(
          (br: IBrainRegionHierarchy) => {
            startTransition(() => {
              onChange?.(br.id);
              onSelectBrainRegion?.(br);
            });
          },
          [onChange] 
        );

        return (
          <BrainRegionDropdown
            defaultBrainRegion={
              value
                ? brainRegionHierarchy?.options.find(({ value: _value }) => value === _value)?.data
                : brainRegionHierarchy?.options.find(
                    ({ value: _value }) => defaultBrainRegion?.id === _value
                  )?.data
            }
            onSelectBrainRegion={handleSelectBrainRegion}
            charsPerLine={charsPerLine}
            clsx={clsx}
            showIcon={showIcon}
          />
        );
      },
    [brainRegionHierarchy, defaultBrainRegion, charsPerLine, clsx, showIcon, onSelectBrainRegion]
  );

  return wrapper;
}
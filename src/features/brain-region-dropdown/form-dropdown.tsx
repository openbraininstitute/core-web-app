import { CheckOutlined, DownOutlined, LoadingOutlined, SearchOutlined } from '@ant-design/icons';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useAtomValue } from 'jotai';
import { loadable, unwrap } from 'jotai/utils';
import {
  type ComponentProps,
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { BrainIcon } from '@/components/icons';
import { brainRegionBasicCellGroupsRegionsExtendedHierarchyAtom } from '@/features/brain-region-hierarchy/context';
import { useDefaultBreakpoint } from '@/ui/hooks/create-break-point';
import { Button } from '@/ui/molecules/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/ui/molecules/popover';
import { cn } from '@/utils/css-class';

import type { IBrainRegionHierarchy } from '@/api/entitycore/types/entities/brain-region';
import type { TBrainRegionHierarchyExtendedOption } from '@/features/brain-region-hierarchy/context';

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
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [parent, setParent] = useState<HTMLDivElement | null>(null);

  const brainRegionHierarchy = useAtomValue(
    useMemo(() => unwrap(brainRegionBasicCellGroupsRegionsExtendedHierarchyAtom), [])
  );
  const isLoading =
    useAtomValue(loadable(brainRegionBasicCellGroupsRegionsExtendedHierarchyAtom)).state ===
    'loading';

  const defaultBrainRegionId = defaultBrainRegion?.id;
  const [selectedNodeOverrideId, updateSelectedNodeOverrideId] = useState<string | undefined>();

  const parentSetter = useCallback((el: HTMLDivElement) => {
    setParent(el);
  }, []);

  const filteredOptions = useMemo<Array<TBrainRegionHierarchyExtendedOption>>(() => {
    const options = (brainRegionHierarchy?.options ??
      []) as Array<TBrainRegionHierarchyExtendedOption>;
    if (!searchTerm.trim()) return options;

    return options.filter(({ label }) => label.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [brainRegionHierarchy, searchTerm]);

  const rowVirtualizer = useVirtualizer({
    count: filteredOptions.length,
    enabled: open && filteredOptions.length > 0 && !!parent,
    useAnimationFrameWithResizeObserver: true,
    getScrollElement: () => parent,
    estimateSize: (index) => {
      const option = filteredOptions[index];
      if (!option) return 40;
      const lineHeight = 24;
      const lines = Math.ceil(option.label.length / charsPerLine);
      return lines * lineHeight + 16;
    },
    overscan: 5,
    paddingEnd: 10,
  });

  const onSelect = useCallback(
    (option: TBrainRegionHierarchyExtendedOption) => {
      updateSelectedNodeOverrideId(option.data.id);
      onSelectBrainRegion?.(option.data);
      setOpen(false);
    },
    [onSelectBrainRegion]
  );

  useEffect(() => {
    let id: number;
    if (open && parent) {
      id = requestAnimationFrame(() => {
        rowVirtualizer.measure();
      });
    }
    return () => {
      if (id) {
        cancelAnimationFrame(id);
      }
    };
  }, [open, rowVirtualizer, parent]);

  const selectedNodeId = selectedNodeOverrideId ?? defaultBrainRegionId;

  const currentValue = useMemo(
    () =>
      selectedNodeId
        ? brainRegionHierarchy?.options.find(({ value: _value }) => selectedNodeId === _value)?.data
        : null,
    [selectedNodeId, brainRegionHierarchy?.options]
  );

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      setSearchTerm('');
    }
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        asChild
        className={cn(
          'text-primary-9 border-neutral-2 hover:bg-primary-9 active:bg-primary-9 border bg-white shadow-xs hover:text-white',
          'text-md h-full flex-1 gap-1.5 rounded-md px-5',
          'flex w-full grow justify-between self-stretch',
          clsx?.trigger
        )}
      >
        <Button variant="outline" role="combobox" disabled={isLoading}>
          {showIcon && <BrainIcon />}
          <div className="line-clamp-1 w-full truncate text-left">
            {currentValue ? currentValue.name : 'Select brain region...'}
          </div>
          {isLoading ? (
            <LoadingOutlined className="opacity-50 [&_svg]:size-3!" spin />
          ) : (
            <DownOutlined className="opacity-50 [&_svg]:size-3!" />
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className={cn('border-neutral-2 bg-white p-0 shadow-md', clsx?.content)}
        style={{
          width: 'var(--radix-popover-trigger-width)',
        }}
      >
        <div className="border-neutral-2 border-b p-2">
          <div data-slot="command-input-wrapper" className={cn('flex h-9 items-center gap-2 px-3')}>
            <SearchOutlined className="size-4 shrink-0 opacity-50" />
            <input
              placeholder="Search brain region..."
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

        <div
          id="brain-region-dropdown-parent"
          ref={parentSetter}
          className="h-full max-h-80 w-full overflow-auto"
        >
          {filteredOptions.length === 0 ? (
            <div className="flex h-full w-full items-center justify-center py-5">
              <span className="text-neutral-4 text-sm">No brain regions found</span>
            </div>
          ) : (
            <div
              className="relative w-full"
              style={{
                height: `${rowVirtualizer.getTotalSize()}px`,
              }}
            >
              {rowVirtualizer.getVirtualItems().map((virtualItem) => {
                const option = filteredOptions[virtualItem.index];
                if (!option) return null;

                const { value: v, label, data } = option;

                return (
                  <div
                    key={filteredOptions[virtualItem.index]?.value ?? virtualItem.index}
                    id={filteredOptions[virtualItem.index]?.value ?? virtualItem.index}
                    style={{
                      height: `${virtualItem.size}px`,
                      transform: `translateY(${virtualItem.start}px)`,
                    }}
                    className={cn(
                      'mb-1 flex items-center justify-start',
                      'absolute top-0 left-0 w-full'
                    )}
                  >
                    <button
                      type="button"
                      aria-label={label}
                      onClick={() => onSelect({ label, value: v, data })}
                      className={cn(
                        'text-primary-9 hover:bg-primary-highlight flex h-full w-full cursor-pointer items-center justify-start px-3 text-left',
                        { 'text-base': breakpoint === 'l' },
                        { 'text-lg': breakpoint === 'xl' },
                        {
                          'text-gray-500! hover:bg-zinc-200! hover:text-gray-500!':
                            !data.is_volumetric_region,
                        }
                      )}
                      title={label}
                    >
                      <span className="line-clamp-2 w-full">{label}</span>
                      <CheckOutlined
                        className={cn(
                          'ml-auto text-sm',
                          v === selectedNodeId ? 'opacity-100' : 'opacity-0'
                        )}
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

export function BrainRegionDropdownWithFormItem({
  onSelectBrainRegion,
  clsx,
  defaultBrainRegion,
  showIcon = true,
  charsPerLine = 200,
  value,
  onChange,
}: Props & {
  value?: string;
  onChange?: (value: string) => void;
}) {
  const brainRegionHierarchy = useAtomValue(
    useMemo(() => unwrap(brainRegionBasicCellGroupsRegionsExtendedHierarchyAtom), [])
  );
  const handleSelectBrainRegion = useCallback(
    (br: IBrainRegionHierarchy) => {
      startTransition(() => {
        onChange?.(br.id);
      });
      onSelectBrainRegion?.(br);
    },
    [onChange, onSelectBrainRegion]
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
}

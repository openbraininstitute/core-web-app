'use client';

import { CloseOutlined } from '@ant-design/icons';
import { capitalize } from 'es-toolkit/compat';

import { HierarchySquare } from '@/components/icons/buttons';
import { useGetSelectedBrainRegion } from '@/features/brain-region-hierarchy/context';
import { Button } from '@/ui/molecules/button';
import { cn } from '@/utils/css-class';

export const ExploreLeftMenuContext = {
  BrainRegionHierarchy: 'brain-region-hierarchy',
  DataGroup: 'group',
} as const;

export type TExploreLeftMenuContext =
  (typeof ExploreLeftMenuContext)[keyof typeof ExploreLeftMenuContext];

type Props = {
  view: TExploreLeftMenuContext;
  onSwitchView: (_view: TExploreLeftMenuContext) => void;
};

export function RegionBanner({ view, onSwitchView }: Props) {
  const { selectedBrainRegion } = useGetSelectedBrainRegion();

  if (!selectedBrainRegion)
    return (
      <div className="relative mb-2 px-2 py-4">
        <div className="h-12 animate-pulse rounded-full bg-gray-100" />
      </div>
    );

  const name = capitalize(selectedBrainRegion.name);
  return (
    <div
      id="brain-region-entities-switcher"
      data-testid="brain-region-entities-switcher"
      className="flex flex-col items-center justify-between gap-2 px-4 py-5"
    >
      {/** biome-ignore lint/a11y/useSemanticElements: it already include the real button */}
      <div
        id="atlas-regions-selector"
        data-testid="atlas-regions-selector"
        className={cn(
          'border-neutral-1 flex h-12! w-full items-center justify-between gap-6 rounded-full py-2 pr-2 pl-4',
          'cursor-pointer',
          { 'shadow-bnb': Boolean(selectedBrainRegion?.id) },
          { 'hover:bg-background': view === ExploreLeftMenuContext.DataGroup }
        )}
        aria-label="brain-region-banner"
        role="button"
        tabIndex={0}
        onKeyDown={() => onSwitchView(ExploreLeftMenuContext.BrainRegionHierarchy)}
        onClick={() => onSwitchView(ExploreLeftMenuContext.BrainRegionHierarchy)}
      >
        <div className="flex items-center justify-center gap-2">
          {selectedBrainRegion && (
            <div className="flex items-center justify-center gap-1 select-none">
              <span className="text-neutral-5 mr-2 text-lg">Region:</span>
              <div className="text-primary-9/90 flex items-center justify-center gap-1.5">
                <div
                  key={`color-${selectedBrainRegion.id}-${selectedBrainRegion.color_hex_triplet}`}
                  className="block h-3! w-3! min-w-3! rounded-full"
                  style={{ backgroundColor: `#${selectedBrainRegion.color_hex_triplet}` }}
                />
                <span className="line-clamp-2 text-lg leading-6 font-bold">{name}</span>
              </div>
            </div>
          )}
        </div>
        {view === ExploreLeftMenuContext.BrainRegionHierarchy ? (
          <Button
            rounded
            variant="ghost"
            className="h-8 w-8"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onSwitchView(ExploreLeftMenuContext.DataGroup);
            }}
          >
            <CloseOutlined className="text-primary-9/90" />
          </Button>
        ) : (
          <HierarchySquare className="mr-2" />
        )}
      </div>
    </div>
  );
}

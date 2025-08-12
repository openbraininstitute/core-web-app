'use client';

import { CloseOutlined } from '@ant-design/icons';

import { useGetSelectedBrainRegion } from '@/features/brain-region-hierarchy/context';
// import { SpeciesSwitcher } from '@/features/brain-region-hierarchy/species-switcher';
import { HierarchySquare } from '@/components/icons/buttons';
import { Button } from '@/ui/molecules/button';
import { cn } from '@/utils/css-class';

// import type { ISpecies } from '@/api/entitycore/types/shared/global';

export const ExploreLeftMenuContext = {
  BrainRegionHierarchy: 'brain-region-hierarchy',
  DataType: 'data-type',
} as const;
export type TExploreLeftMenuContext =
  (typeof ExploreLeftMenuContext)[keyof typeof ExploreLeftMenuContext];

type Props = {
  view: TExploreLeftMenuContext;
  onSwitchView: (_view: TExploreLeftMenuContext) => void;
};

export function RegionBanner({ view, onSwitchView }: Props) {
  const { selectedBrainRegion } = useGetSelectedBrainRegion();
  // const [currentSpecies, setCurrentSpecies] = useState<ISpecies | null>(null);
  // const speciesOptions = [
  //   { value: 'rodent', label: 'Rodent', data: null },
  //   { value: 'human', label: 'Human', data: null },
  //   { value: 'primate', label: 'Primate', data: null },
  // ];

  // const handleSpeciesChange = (species: ISpecies | null) => {
  //   setCurrentSpecies(species);
  // };

  return (
    <div
      id="entity-counter-container"
      data-testid="entity-counter-container"
      className="flex flex-col items-center justify-between gap-2 px-4 py-5"
    >
      <div
        className={cn(
          'border-neutral-1 flex w-full items-center justify-between gap-6 rounded-full py-2 pr-2 pl-4',
          { 'shadow-2xl': Boolean(selectedBrainRegion?.id) }
        )}
      >
        <div className="flex items-center justify-center gap-2">
          {/* {currentSpecies?.name && (
            <div className="flex items-center justify-center gap-1">
              <span className="text-neutral-2">Species</span>
              <span className="text-primary-9/90">{currentSpecies.name}</span>
            </div>
          )} */}
          {selectedBrainRegion && (
            <div className="flex items-center justify-center gap-1">
              <span className="text-neutral-2">Region:</span>
              <div className="text-primary-9/90 flex items-center justify-center gap-1.5">
                <div
                  key={`color-${selectedBrainRegion.id}-${selectedBrainRegion.color_hex_triplet}`}
                  className="block h-3! w-3! min-w-3! rounded-full"
                  style={{ backgroundColor: `#${selectedBrainRegion.color_hex_triplet}` }}
                />
                <span className="line-clamp-2 leading-4 font-bold">{selectedBrainRegion.name}</span>
              </div>
            </div>
          )}
        </div>
        <Button
          rounded
          variant="ghost"
          className="h-8 w-8"
          onClick={() =>
            onSwitchView(
              view === ExploreLeftMenuContext.BrainRegionHierarchy
                ? ExploreLeftMenuContext.DataType
                : ExploreLeftMenuContext.BrainRegionHierarchy
            )
          }
        >
          {view === ExploreLeftMenuContext.BrainRegionHierarchy ? (
            <HierarchySquare />
          ) : (
            <CloseOutlined className="text-primary-9/90" />
          )}
        </Button>
      </div>
      {/* <div className="flex w-full items-center gap-2 text-sm">
        <div className="relative flex w-full flex-col items-start">
          <span className="text-neutral-3">Species</span>
          <SpeciesSwitcher options={speciesOptions} onSelect={handleSpeciesChange} />
        </div>
      </div> */}
    </div>
  );
}

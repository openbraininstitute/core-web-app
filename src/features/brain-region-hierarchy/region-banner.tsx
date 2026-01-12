"use client";

import { CloseOutlined } from "@ant-design/icons";
import { HierarchySquare } from "@/components/icons/buttons";
import { SpeciesSelector } from "@/features/brain-region-hierarchy/components/species-selector";
import { useWorkspaceAtlasHierarchy } from "@/features/brain-region-hierarchy/hooks";
import { Button } from "@/ui/molecules/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/ui/molecules/tooltip";
import { cn } from "@/utils/css-class";

export const ExploreLeftMenuContext = {
  BrainRegionHierarchy: "brain-region-hierarchy",
  DataGroup: "group",
} as const;

export type TExploreLeftMenuContext =
  (typeof ExploreLeftMenuContext)[keyof typeof ExploreLeftMenuContext];

type Props = {
  view: TExploreLeftMenuContext;
  onSwitchView: (_view: TExploreLeftMenuContext) => void;
  dataKey: string;
};

export function RegionBanner({ view, onSwitchView, dataKey }: Props) {
  const {
    selectedSpecies,
    selectedBrainRegion,
    changeSpecies,
    isLoadingHierarchies,
  } = useWorkspaceAtlasHierarchy({ dataKey });

  if (!selectedBrainRegion && !isLoadingHierarchies) {
    return (
      <div className="relative mb-2 px-2 pt-4 pb-1">
        <div className="h-12 animate-pulse rounded-full bg-gray-100" />
      </div>
    );
  }

  return (
    <div
      id="brain-region-entities-switcher"
      data-testid="brain-region-entities-switcher"
      className="flex flex-col items-center justify-between gap-2 px-4 pt-5 pb-1"
    >
      <div
        id="atlas-regions-selector"
        data-testid="atlas-regions-selector"
        className={cn(
          "border-neutral-1 flex h-auto min-h-12 w-full items-center justify-between gap-2 rounded-full py-2 pr-2 pl-4",
          "cursor-pointer",
          { "shadow-bnb": Boolean(selectedBrainRegion?.id) },
          { "hover:bg-background": view === ExploreLeftMenuContext.DataGroup },
        )}
        data-label="brain-region-banner"
      >
        <div className="flex items-center gap-3 flex-nowrap">
          <SpeciesSelector
            selectedSpecies={selectedSpecies}
            onSpeciesChange={changeSpecies}
          />
          <div className="h-6 w-px bg-gray-200" />
          {selectedBrainRegion && (
            <div
              data-label="brain-region-switcher"
              className="flex items-center gap-1 select-none"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                // Only trigger on Enter or Space, not when interacting with dropdown
                if (e.key === "Enter" || e.key === " ") {
                  onSwitchView(ExploreLeftMenuContext.BrainRegionHierarchy);
                }
              }}
              onClick={() =>
                onSwitchView(ExploreLeftMenuContext.BrainRegionHierarchy)
              }
            >
              <span className="text-neutral-5 text-base">Region</span>
              <div className="text-primary-9/90 flex items-center gap-1.5">
                <div
                  key={`color-${selectedBrainRegion.id}-${selectedBrainRegion.color_hex_triplet}`}
                  className="block h-3 w-3 min-w-3 rounded-full"
                  style={{
                    backgroundColor: `#${selectedBrainRegion.color_hex_triplet}`,
                  }}
                />

                <Tooltip>
                  <TooltipTrigger>
                    <span className="line-clamp-1 text-left text-base font-bold leading-6">
                      {selectedBrainRegion.name}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent
                    avoidCollisions
                    side="top"
                    sideOffset={10}
                    collisionPadding={{ left: 25 }}
                    className="bg-white shadow-bnb text-primary-8 border-gray-200"
                    arrowClassName="bg-white"
                  >
                    {selectedBrainRegion.name}
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          )}
        </div>

        {view === ExploreLeftMenuContext.BrainRegionHierarchy ? (
          <Button
            rounded
            variant="ghost"
            className="h-8 w-8 shrink-0"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onSwitchView(ExploreLeftMenuContext.DataGroup);
            }}
          >
            <CloseOutlined className="text-primary-9/90" />
          </Button>
        ) : (
          <HierarchySquare className="mr-2 shrink-0" />
        )}
      </div>
    </div>
  );
}

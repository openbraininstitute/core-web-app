'use client';

import { CloseOutlined } from '@ant-design/icons';
import { capitalize } from 'es-toolkit/compat';

import { HierarchySquare } from '@/components/icons/buttons';
import { useAppNotification } from '@/components/notification';
import { ATLAS_3D_VIEWER_ERROR_MESSAGE_KEY } from '@/features/brain-atlas-viewer/brain-atlas-viewer-gltf/hooks';
import { SpeciesSelector } from '@/features/brain-region-hierarchy/components/species-selector';
import { useBrainRegionRootHierarchyQuery } from '@/features/brain-region-hierarchy/context';
import {
  useAvailableHierarchySpeciesQuery,
  useRemoteUserPreferenceHierarchySpeciesQuery,
  useWorkspaceHierarchyRegistry,
} from '@/features/brain-region-hierarchy/hooks';
import { Button } from '@/ui/molecules/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/molecules/tooltip';
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
  const notifier = useAppNotification();
  const { workspaceSpecies, selectedBrainRegion, changeBulkStoreHierarchySpecies } =
    useWorkspaceHierarchyRegistry();
  const { loading: isLoadingRootHierarchy } = useBrainRegionRootHierarchyQuery();
  const { loading: isLoadingAvailableHierarchySpecies } = useAvailableHierarchySpeciesQuery();
  const { loading: isLoadingRemoteUserPreferenceHierarchySpecies } =
    useRemoteUserPreferenceHierarchySpeciesQuery();

  const onSpeciesChange = (hId: string) => {
    changeBulkStoreHierarchySpecies(hId);
    notifier.destroy(ATLAS_3D_VIEWER_ERROR_MESSAGE_KEY);
  };

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
          'border-neutral-1 flex h-auto min-h-12 w-full items-center justify-between gap-2 rounded-full',
          'cursor-pointer shadow-bnb relative',
          { 'hover:bg-background': view === ExploreLeftMenuContext.DataGroup }
        )}
        data-label="brain-region-banner"
      >
        <div className="flex items-center flex-nowrap w-full min-w-0">
          <div className="pr-3 pl-4 hover:bg-gray-100 rounded-l-full shrink-0">
            <SpeciesSelector selectedSpecies={workspaceSpecies} onSpeciesChange={onSpeciesChange} />
          </div>
          <div className="h-6 w-px bg-gray-200 shrink-0" />
          <div className="items-stretch h-12 w-full rounded-r-full pl-3 pr-10 hover:bg-gray-100 py-2 min-w-0 overflow-hidden">
            {/** biome-ignore lint/a11y/useSemanticElements: tooltip is using button internally */}
            <div
              data-label="brain-region-switcher"
              className="flex items-center gap-1 h-full select-none w-full min-w-0"
              tabIndex={0}
              role="button"
              onKeyDown={(e) => {
                // Only trigger on Enter or Space, not when interacting with dropdown
                if (e.key === 'Enter' || e.key === ' ') {
                  onSwitchView(ExploreLeftMenuContext.BrainRegionHierarchy);
                }
              }}
              onClick={() => onSwitchView(ExploreLeftMenuContext.BrainRegionHierarchy)}
            >
              <span className="text-neutral-5 text-base shrink-0">Region</span>
              {(isLoadingRootHierarchy ||
                isLoadingAvailableHierarchySpecies ||
                isLoadingRemoteUserPreferenceHierarchySpecies) && (
                <div className="h-5 w-full animate-pulse rounded-full bg-gray-200 max-w-3/5" />
              )}
              {selectedBrainRegion && !isLoadingRootHierarchy && (
                <div className="text-primary-9/90 flex items-center gap-1.5 flex-1 min-w-0">
                  <div
                    key={`color-${selectedBrainRegion.id}-${selectedBrainRegion.color_hex_triplet}`}
                    className="block h-3 w-3 min-w-3 rounded-full shrink-0"
                    style={{
                      backgroundColor: `#${selectedBrainRegion.color_hex_triplet}`,
                    }}
                  />

                  <Tooltip disableHoverableContent>
                    <TooltipTrigger className="min-w-0 flex-1">
                      <span className="block truncate text-left text-base font-bold leading-6">
                        {capitalize(selectedBrainRegion.name)}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent
                      avoidCollisions
                      side="top"
                      sideOffset={0}
                      className="bg-white shadow-bnb text-primary-8 border-gray-200"
                      arrowClassName="bg-white"
                    >
                      {selectedBrainRegion.name}
                    </TooltipContent>
                  </Tooltip>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="absolute top-1/2 -translate-y-1/2 right-1.5 rounded-full">
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
            <Button
              rounded
              variant="ghost"
              className="h-8 w-8 shrink-0"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onSwitchView(ExploreLeftMenuContext.BrainRegionHierarchy);
              }}
            >
              <HierarchySquare className="text-primary-9/90" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

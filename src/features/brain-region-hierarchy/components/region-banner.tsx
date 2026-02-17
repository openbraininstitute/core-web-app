'use client';

import { CloseOutlined } from '@ant-design/icons';
import { capitalize } from 'es-toolkit/compat';
import { type ReactNode, Suspense, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useHotkeys } from 'react-hotkeys-hook';

import { HierarchySquare } from '@/components/icons/buttons';
import { useAppNotification } from '@/components/notification';
import { ATLAS_3D_VIEWER_ERROR_MESSAGE_KEY } from '@/features/brain-atlas-viewer/brain-atlas-viewer-gltf/hooks';
import { BrainRegionHierarchy } from '@/features/brain-region-hierarchy';
import { TreeSkeleton } from '@/features/brain-region-hierarchy/components/brain-region-skeleton';
import { SpeciesSelector } from '@/features/brain-region-hierarchy/components/species-selector';
import { useBrainRegionRootHierarchyQuery } from '@/features/brain-region-hierarchy/context';
import {
  useAvailableHierarchySpeciesQuery,
  useRemoteUserPreferenceHierarchySpeciesQuery,
  useWorkspaceHierarchyRegistry,
} from '@/features/brain-region-hierarchy/hooks';
import { useOnClickOutside } from '@/hooks/useOnClickOutside';
import { Button } from '@/ui/molecules/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/molecules/tooltip';
import { cn } from '@/utils/css-class';

import type { TTreeNode } from '@/components/tree/types';

export const ExploreLeftMenuContext = {
  BrainRegionHierarchy: 'brain-region-hierarchy',
  DataGroup: 'group',
} as const;

export type TExploreLeftMenuContext =
  (typeof ExploreLeftMenuContext)[keyof typeof ExploreLeftMenuContext];

type RegionBannerProps = {
  view: TExploreLeftMenuContext;
  onSwitchView: (_view: TExploreLeftMenuContext) => void;
  classNames?: {
    container?: string;
    selector?: string;
  };
};

type PortalRegionBannerProps = {
  dataKey?: string;
  initialOpen?: boolean;
  width?: number | string;
  children?: ReactNode;
  className?: string;
  modalClassName?: string;
  portalContainer?: HTMLElement | null;
  onRegionSelect?: (_node: TTreeNode) => void;
};

export function RegionBanner({ view, onSwitchView, classNames }: RegionBannerProps) {
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
      className={cn(
        'flex flex-col items-center justify-between gap-2 ml-0.5',
        classNames?.container
      )}
    >
      <div
        id="atlas-regions-selector"
        data-testid="atlas-regions-selector"
        className={cn(
          'border-neutral-1 flex h-auto min-h-12 w-full items-center justify-between gap-2 rounded-full',
          'cursor-pointer relative',
          { 'hover:bg-background': view === ExploreLeftMenuContext.DataGroup },
          classNames?.selector
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

export function PortalRegionBanner({
  dataKey,
  initialOpen = false,
  width,
  children,
  className,
  modalClassName = 'rounded-2xl bg-white shadow-xl',
  portalContainer,
  onRegionSelect,
}: PortalRegionBannerProps) {
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const portalContentRef = useRef<HTMLDivElement | null>(null);
  const autoDataKeyId = useId();
  const [isOpen, setIsOpen] = useState(initialOpen);
  const [defaultPortalContainer, setDefaultPortalContainer] = useState<HTMLElement | null>(null);
  const [anchorPosition, setAnchorPosition] = useState({ left: 0, bottom: 0, width: 0 });
  const effectiveDataKey = dataKey ?? `portal-region-${autoDataKeyId.replaceAll(':', '')}`;

  useEffect(() => {
    setDefaultPortalContainer(document.body);
  }, []);

  useEffect(() => {
    const updateAnchorPosition = () => {
      const rect = anchorRef.current?.getBoundingClientRect();
      if (!rect) return;
      setAnchorPosition({
        left: rect.left,
        bottom: rect.bottom,
        width: rect.width,
      });
    };

    updateAnchorPosition();
    window.addEventListener('resize', updateAnchorPosition);
    window.addEventListener('scroll', updateAnchorPosition, { passive: true });

    const resizeObserver = new ResizeObserver(() => {
      updateAnchorPosition();
    });
    if (anchorRef.current) {
      resizeObserver.observe(anchorRef.current);
    }

    return () => {
      window.removeEventListener('resize', updateAnchorPosition);
      window.removeEventListener('scroll', updateAnchorPosition);
      resizeObserver.disconnect();
    };
  }, []);

  const targetPortalContainer = portalContainer ?? defaultPortalContainer;

  const safeY = Math.max(0, anchorPosition.bottom);
  const remainingHeight = `calc(100dvh - ${safeY}px - 20px)`;
  const computedWidth = width ?? anchorPosition.width;
  const view = isOpen
    ? ExploreLeftMenuContext.BrainRegionHierarchy
    : ExploreLeftMenuContext.DataGroup;
  const onSwitchView = (nextView: TExploreLeftMenuContext) => {
    if (nextView === ExploreLeftMenuContext.BrainRegionHierarchy) {
      setIsOpen(true);
      return;
    }
    setIsOpen(false);
  };
  const onClickBrainRegion = (node: TTreeNode) => {
    setIsOpen(false);
    onRegionSelect?.(node);
  };

  useHotkeys(
    'esc',
    () => {
      setIsOpen(false);
    },
    {
      enabled: isOpen,
      preventDefault: true,
    },
    [isOpen]
  );

  useOnClickOutside(
    portalContentRef,
    () => {
      if (!isOpen) return;
      setIsOpen(false);
    },
    undefined,
    (event) => {
      if (!isOpen) return true;
      const targetNode = event.target as Node | null;
      if (!targetNode) return false;
      return anchorRef.current?.contains(targetNode) ?? false;
    }
  );

  const content = children ?? (
    <Suspense fallback={<TreeSkeleton />}>
      <div className="flex h-full min-h-0 flex-col overflow-hidden">
        <div className="text-primary-9/90 mb-1 px-5 pt-4 text-base font-bold">Brain region</div>
        <div className="min-h-0 flex-1 overflow-hidden p-2">
          <BrainRegionHierarchy dataKey={effectiveDataKey} onClickCallback={onClickBrainRegion} />
        </div>
      </div>
    </Suspense>
  );

  return (
    <>
      <div ref={anchorRef} className={cn('w-full', className)}>
        <RegionBanner
          view={view}
          onSwitchView={onSwitchView}
          classNames={{ selector: 'shadow-md bg-white' }}
        />
      </div>
      {isOpen && targetPortalContainer
        ? createPortal(
            <div
              data-testid="portal-region-banner"
              className="fixed z-50"
              style={{ left: anchorPosition.left, top: safeY + 5, width: computedWidth }}
            >
              <div
                ref={portalContentRef}
                className={cn('min-h-0 overflow-hidden', modalClassName)}
                style={{
                  height: remainingHeight,
                  maxHeight: remainingHeight,
                }}
              >
                {content}
              </div>
            </div>,
            targetPortalContainer
          )
        : null}
    </>
  );
}

export const ModalRegionBanner = PortalRegionBanner;

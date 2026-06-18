'use client';

import { CloseOutlined } from '@ant-design/icons';
import { capitalize } from 'es-toolkit/compat';
import { useAtomValue } from 'jotai';
import { type ReactNode, Suspense, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useHotkeys } from 'react-hotkeys-hook';

import { HierarchySquare } from '@/components/icons/buttons';
import { useAppNotification } from '@/components/notification';
import { ATLAS_3D_VIEWER_ERROR_MESSAGE_KEY } from '@/features/brain-atlas-viewer/brain-atlas-viewer-gltf/constants';
import { BrainRegionHierarchy } from '@/features/brain-region-hierarchy';
import { TreeSkeleton } from '@/features/brain-region-hierarchy/components/brain-region-skeleton';
import { SpeciesSelector } from '@/features/brain-region-hierarchy/components/species-selector';
import {
  allowAllSpeciesAtom,
  speciesSelectionModeAtom,
} from '@/features/brain-region-hierarchy/context';
import { useWorkspaceHierarchyRegistry } from '@/features/brain-region-hierarchy/hooks';
import { SpeciesSelectionMode } from '@/features/brain-region-hierarchy/types';
import { useOnClickOutside } from '@/hooks/useOnClickOutside';
import { Button } from '@/ui/molecules/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/molecules/tooltip';
import { cn } from '@/utils/css-class';

import type { BrainRegionHierarchyBase } from '@/api/entitycore/types/entities/brain-region';
import type { TTreeNode } from '@/components/tree/types';

export const ExploreLeftMenuContext = {
  BrainRegionHierarchy: 'brain-region-hierarchy',
  DataGroup: 'group',
} as const;

export type TExploreLeftMenuContext =
  (typeof ExploreLeftMenuContext)[keyof typeof ExploreLeftMenuContext];

type TRegionBannerClassNames = {
  container?: string;
  selector?: string;
};

type RegionBannerProps = {
  view: TExploreLeftMenuContext;
  onSwitchView: (_view: TExploreLeftMenuContext) => void;
  classNames?: TRegionBannerClassNames;
};

type TPortalRegionBannerProps = {
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
  const {
    changeBulkStoreHierarchySpecies,
    displaySpecies,
    isUiLoading,
    selectedBrainRegion,
    speciesSelectionMode,
    workspaceHierarchyId,
    remoteAvailableHierarchies,
  } = useWorkspaceHierarchyRegistry();
  const allowAllSpecies = useAtomValue(allowAllSpeciesAtom);

  const isAllMode = speciesSelectionMode === SpeciesSelectionMode.All;

  const handleSpeciesChange = (hIdOrMode: string) => {
    changeBulkStoreHierarchySpecies(hIdOrMode);
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
        data-label="brain-region-banner"
        className={cn(
          'border-gray-100 border borders relative flex h-12.5 w-full items-center justify-between gap-2 rounded-full',
          !isAllMode && 'cursor-pointer',
          !isAllMode && view === ExploreLeftMenuContext.DataGroup && 'hover:bg-background',
          classNames?.selector
        )}
      >
        <div className="flex w-full min-w-0 items-center flex-nowrap">
          <div
            className={cn(
              'pr-3 pl-4 hover:bg-gray-100 min-w-0',
              isAllMode ? 'w-full rounded-full' : 'flex-1 rounded-l-full'
            )}
          >
            <SpeciesSelector
              displaySpecies={displaySpecies}
              workspaceHierarchyId={workspaceHierarchyId}
              isAllMode={isAllMode}
              isLoading={isUiLoading}
              allowAllSpecies={allowAllSpecies}
              remoteAvailableHierarchies={remoteAvailableHierarchies}
              onSpeciesChange={handleSpeciesChange}
            />
          </div>
          {!isAllMode && (
            <FocusedModeContent
              loading={isUiLoading}
              selectedBrainRegion={selectedBrainRegion}
              onOpenTree={() => onSwitchView(ExploreLeftMenuContext.BrainRegionHierarchy)}
            />
          )}
        </div>
        {!isAllMode && <HierarchyToggleButton view={view} onSwitchView={onSwitchView} />}
      </div>
    </div>
  );
}

export function FocusedModeContent({
  loading,
  selectedBrainRegion,
  onOpenTree,
}: {
  loading: boolean;
  selectedBrainRegion: BrainRegionHierarchyBase | null;
  onOpenTree: () => void;
}) {
  return (
    <>
      <div className="h-6 w-px bg-gray-200 shrink-0" />
      <div className="items-stretch h-12 w-full flex-1 rounded-r-full pl-3 pr-10 hover:bg-gray-100 py-2 min-w-0 overflow-hidden">
        {/** biome-ignore lint/a11y/useSemanticElements: tooltip is using button internally */}
        <div
          data-label="brain-region-switcher"
          className="flex items-center gap-1 h-full select-none w-full min-w-0"
          tabIndex={0}
          role="button"
          onClick={onOpenTree}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') onOpenTree();
          }}
        >
          <span className="text-neutral-5 text-base shrink-0">Region</span>
          {loading ? (
            <div
              className="h-5 w-full max-w-3/5 animate-pulse rounded-full bg-gray-200"
              aria-hidden
            />
          ) : selectedBrainRegion ? (
            <SelectedRegionPill region={selectedBrainRegion} />
          ) : (
            <span className="text-neutral-4 truncate text-sm">Select region</span>
          )}
        </div>
      </div>
    </>
  );
}

export function SelectedRegionPill({ region }: { region: BrainRegionHierarchyBase }) {
  return (
    <div className="text-primary-9/90 flex items-center gap-1.5 flex-1 min-w-0">
      <div
        key={`color-${region.id}-${region.color_hex_triplet}`}
        className="block h-3 w-3 min-w-3 rounded-full shrink-0"
        style={{ backgroundColor: `#${region.color_hex_triplet}` }}
      />
      <Tooltip disableHoverableContent>
        <TooltipTrigger className="min-w-0 flex-1">
          <span className="block h-6 min-w-0 truncate text-left text-base leading-6 font-bold">
            {capitalize(region.name)}
          </span>
        </TooltipTrigger>
        <TooltipContent
          avoidCollisions
          side="top"
          sideOffset={0}
          className="bg-white shadow-bnb text-primary-8 border-gray-200"
          arrowClassName="bg-white"
        >
          {region.name}
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

export function HierarchyToggleButton({
  view,
  onSwitchView,
}: {
  view: TExploreLeftMenuContext;
  onSwitchView: (_view: TExploreLeftMenuContext) => void;
}) {
  const isTreeOpen = view === ExploreLeftMenuContext.BrainRegionHierarchy;
  const nextView = isTreeOpen
    ? ExploreLeftMenuContext.DataGroup
    : ExploreLeftMenuContext.BrainRegionHierarchy;

  return (
    <div className="absolute top-1/2 -translate-y-1/2 right-1.5 rounded-full">
      <Button
        rounded
        variant="ghost"
        className="h-8 w-8 shrink-0"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onSwitchView(nextView);
        }}
      >
        {isTreeOpen ? (
          <CloseOutlined className="text-primary-9/90" />
        ) : (
          <HierarchySquare className="text-primary-9/90" />
        )}
      </Button>
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
}: TPortalRegionBannerProps) {
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const portalContentRef = useRef<HTMLDivElement | null>(null);
  const autoDataKeyId = useId();
  const [isOpen, setIsOpen] = useState(initialOpen);
  const [defaultPortalContainer, setDefaultPortalContainer] = useState<HTMLElement | null>(null);
  const [anchorPosition, setAnchorPosition] = useState({ left: 0, bottom: 0, width: 0 });
  const [isInsideModal, setIsInsideModal] = useState(false);
  const effectiveDataKey = dataKey ?? `portal-region-${autoDataKeyId.replaceAll(':', '')}`;
  const speciesSelectionMode = useAtomValue(speciesSelectionModeAtom);
  const isAllMode = speciesSelectionMode === SpeciesSelectionMode.All;
  const isTreeOpen = isOpen && !isAllMode;

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
      setIsInsideModal(!!anchorRef.current?.closest('#modal-dialog'));
    };

    updateAnchorPosition();
    window.addEventListener('resize', updateAnchorPosition);
    window.addEventListener('scroll', updateAnchorPosition, { passive: true });

    const resizeObserver = new ResizeObserver(updateAnchorPosition);
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

  const view = isTreeOpen
    ? ExploreLeftMenuContext.BrainRegionHierarchy
    : ExploreLeftMenuContext.DataGroup;

  const onSwitchView = (nextView: TExploreLeftMenuContext) => {
    if (isAllMode) return;
    setIsOpen(nextView === ExploreLeftMenuContext.BrainRegionHierarchy);
  };

  const onClickBrainRegion = (node: TTreeNode) => {
    setIsOpen(false);
    onRegionSelect?.(node);
  };

  useHotkeys('esc', () => setIsOpen(false), { enabled: isTreeOpen, preventDefault: true }, [
    isTreeOpen,
  ]);

  useOnClickOutside(
    portalContentRef,
    () => {
      if (!isTreeOpen) return;
      setIsOpen(false);
    },
    undefined,
    (event) => {
      if (!isTreeOpen) return true;
      const targetNode = event.target as Node | null;
      if (!targetNode) return false;
      const targetElement = targetNode instanceof Element ? targetNode : targetNode.parentElement;
      // Ant Select renders search options in a body-level dropdown portal;
      // treat interactions inside it as internal clicks.
      if (targetElement?.closest('.ant-select-dropdown')) return true;
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
          classNames={{ selector: 'bg-white shadow-sm' }}
        />
      </div>
      {isTreeOpen && targetPortalContainer
        ? createPortal(
            <div
              data-testid="portal-region-banner"
              className={cn('fixed', isInsideModal ? 'z-1002' : 'z-50')}
              style={{ left: anchorPosition.left, top: safeY + 5, width: computedWidth }}
            >
              <div
                ref={portalContentRef}
                className={cn('min-h-0 overflow-hidden', modalClassName)}
                style={{ height: remainingHeight, maxHeight: remainingHeight }}
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

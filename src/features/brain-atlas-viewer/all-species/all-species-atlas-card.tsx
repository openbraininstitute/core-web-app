'use client';

import { useAppNotification } from '@/components/notification';
import {
  resolveSpeciesAtlasPreview,
  type SpeciesRuntimeHierarchy,
} from '@/features/brain-atlas-viewer/all-species/helpers';
import { SpeciesAtlasPreview } from '@/features/brain-atlas-viewer/all-species/species-atlas-preview';
import { ATLAS_3D_VIEWER_ERROR_MESSAGE_KEY } from '@/features/brain-atlas-viewer/brain-atlas-viewer-gltf/constants';
import { useWorkspaceHierarchyRegistry } from '@/features/brain-region-hierarchy/hooks';
import { cn } from '@/utils/css-class';

import type { KeyboardEvent, MouseEvent } from 'react';

type AllSpeciesAtlasCardProps = {
  hierarchy: SpeciesRuntimeHierarchy;
};

function isPreviewTarget(target: EventTarget | null) {
  return target instanceof Element && !!target.closest('[data-species-atlas-preview]');
}

export function AllSpeciesAtlasCard({ hierarchy }: AllSpeciesAtlasCardProps) {
  const { species } = hierarchy;
  const preview = resolveSpeciesAtlasPreview(hierarchy);
  const { changeBulkStoreHierarchySpecies } = useWorkspaceHierarchyRegistry();
  const notifier = useAppNotification();

  if (!preview) return null;

  const handleSelectSpecies = () => {
    changeBulkStoreHierarchySpecies(hierarchy.id);
    notifier.destroy(ATLAS_3D_VIEWER_ERROR_MESSAGE_KEY);
  };

  const handleCardClick = (event: MouseEvent<HTMLElement>) => {
    if (isPreviewTarget(event.target)) return;
    handleSelectSpecies();
  };

  const handleCardKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    if (isPreviewTarget(event.target)) return;
    event.preventDefault();
    handleSelectSpecies();
  };

  return (
    <article
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
      className={cn(
        'flex min-w-0 cursor-pointer flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm outline-none',
        'transition-colors hover:bg-gray-100'
      )}
    >
      <div className="min-w-0">
        <h3 className="truncate text-xl font-semibold text-primary-9">{species.displayName}</h3>
        <p className="truncate text-base text-primary-8/80">{species.name}</p>
      </div>

      <div data-species-atlas-preview className="cursor-default">
        <SpeciesAtlasPreview
          hierarchyId={hierarchy.id}
          preview={preview}
          regionName={species.displayName}
          speciesName={species.name}
        />
      </div>
    </article>
  );
}

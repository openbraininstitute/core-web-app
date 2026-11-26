'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';

import { getPointCouldData } from '@/features/brain-atlas-viewer/brain-atlas-viewer-gltf/services/services';
import { SPECIES_TAXONOMY_IDS } from '@/features/brain-region-hierarchy/types';
import { useAccessToken } from '@/hooks/useAccessToken';
import { log, logError } from '@/utils/logger';

import { focusFor, loadAtlasModel, loadRegionPart } from './atlas-model';
import { BrainExplorer } from './brain-explorer';
import { loadHumanBrain } from './human-brain';

import type { IBrainRegionHierarchy } from '@/api/entitycore/types/entities/brain-region';
import type { IAtlasModel } from './atlas-model';
import type { IFocusInfo } from './brain-explorer';
import type { IBrainModel, IBrainPart } from './brain-scene';

const ATLAS_LABELS: Record<string, string> = {
  [SPECIES_TAXONOMY_IDS.MUS_MUSCULUS]: 'Allen Mouse Brain Atlas (CCFv3)',
  [SPECIES_TAXONOMY_IDS.RATTUS_NORVEGICUS]: 'Waxholm Space Rat Brain Atlas',
};

/**
 * A species' brain in the explorer. The human one is the Desikan–Killiany brain (the user asked for it in place of
 * the Julich atlas), whose parts are picked and focused here; any other is its atlas from EntityCore in its major
 * divisions, where picking a division selects that brain region (`onSelectRegion`) and the selected region is what
 * is focused, a region deeper than the divisions drawn on its own, with the mouse's neurons in it.
 */
export function ExplorerAtlas({
  taxonomyId,
  atlasId,
  root,
  selected,
  onSelectRegion,
  onLoading,
  compact = false,
  zoom,
  clear,
  className,
}: {
  taxonomyId?: string;
  atlasId?: string;
  root?: IBrainRegionHierarchy | null;
  /** the selected brain region */
  selected?: IBrainRegionHierarchy | null;
  onSelectRegion?: (regionId: string) => void;
  onLoading?: (loading: boolean) => void;
  compact?: boolean;
  /** how large the brain is drawn (a small one's default is 1.6) */
  zoom?: number;
  clear?: string;
  className?: string;
}) {
  const human = taxonomyId === SPECIES_TAXONOMY_IDS.HOMO_SAPIENS;
  const mouse = taxonomyId === SPECIES_TAXONOMY_IDS.MUS_MUSCULUS;
  const queryClient = useQueryClient();
  const accessToken = useAccessToken();
  const [model, setModel] = useState<IBrainModel | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [detail, setDetail] = useState<IBrainPart | null>(null);
  const [points, setPoints] = useState<{ data: Float32Array; colour: string } | null>(null);
  // the human brain's picked region (both hemispheres' parts of it)
  const [picked, setPicked] = useState<{ regionId: string; part: IBrainPart } | null>(null);

  const rootId = root?.id;
  useEffect(() => {
    let live = true;
    setModel(null);
    setError(null);
    const loading = human
      ? loadHumanBrain()
      : atlasId && root
        ? loadAtlasModel({ atlasId, root, label: taxonomyId ? ATLAS_LABELS[taxonomyId] : undefined, queryClient })
        : null;
    if (!loading) {
      onLoading?.(false);
      return;
    }
    onLoading?.(true);
    loading
      .then((m) => live && setModel(m))
      .catch((e) => {
        logError('The brain did not load', e);
        if (live) setError(e instanceof Error ? e : new Error(String(e)));
      })
      .finally(() => live && onLoading?.(false));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [human, atlasId, rootId]);

  const atlas = !human && model ? (model as IAtlasModel) : null;
  const target = useMemo(
    () => (atlas && root ? focusFor(root, atlas.divisions, selected?.id) : null),
    [atlas, root, selected?.id]
  );

  // a region deeper than the divisions, drawn on its own
  const detailRegion = target?.detail ?? null;
  useEffect(() => {
    let live = true;
    setDetail(null);
    if (!detailRegion || !atlasId) return;
    loadRegionPart({ atlasId, region: detailRegion, queryClient })
      .then((part) => live && setDetail(part))
      .catch((e) => logError('The region’s mesh did not load', e));
    return () => {
      live = false;
    };
  }, [detailRegion, atlasId, queryClient]);

  // the mouse's neurons in the selected region
  const annotation = mouse && selected && selected.id !== rootId ? selected.annotation_value : null;
  const regionColour = `#${selected?.color_hex_triplet ?? 'ffffff'}`;
  useEffect(() => {
    let live = true;
    setPoints(null);
    if (annotation === null || annotation === undefined || !accessToken || compact) return;
    getPointCouldData(annotation, accessToken)
      .then((data) => live && setPoints({ data, colour: regionColour }))
      // (its service is out of reach of a local app, as it was for the old viewer)
      .catch((e) => log('warn', 'The region’s neurons did not load', e));
    return () => {
      live = false;
    };
  }, [annotation, accessToken, compact, regionColour]);

  const extras = useMemo(() => (detail ? [detail] : []), [detail]);

  let focus: string[] | null = null;
  let focusInfo: IFocusInfo | null = null;
  if (human && model && picked) {
    focus = model.parts.filter((p) => p.regionId === picked.regionId).map((p) => p.id);
    const side = picked.part.hemi === 'L' ? 'left' : picked.part.hemi === 'R' ? 'right' : null;
    focusInfo = {
      title: picked.part.name,
      subtitle: [picked.part.group, side && `${side} hemisphere clicked · both highlighted`].filter(Boolean).join(' · '),
      colour: picked.part.colours.regions,
    };
  } else if (target?.focus && selected) {
    // a deeper region without a mesh is shown by its division
    focus = target.detail && !detail ? (target.division ? [target.division.id] : null) : target.focus;
    focusInfo = {
      title: selected.name,
      subtitle: target.detail && !detail && target.division ? `In ${target.division.name}` : 'Selected brain region',
      colour: `#${selected.color_hex_triplet}`,
    };
  }

  const onPick = (part: IBrainPart | null) => {
    if (human) {
      setPicked(part?.regionId ? { regionId: part.regionId, part } : null);
      return;
    }
    if (part?.regionId && part.regionId !== selected?.id) onSelectRegion?.(part.regionId);
  };

  // the error boundary round the viewer says it could not be shown
  // (a small one just stays empty)
  if (error && !compact) throw error;

  return (
    <BrainExplorer
      model={model}
      extras={extras}
      points={points}
      focus={focus}
      focusInfo={focusInfo}
      onPick={compact ? undefined : onPick}
      compact={compact}
      zoom={zoom}
      clear={clear}
      className={className}
    />
  );
}

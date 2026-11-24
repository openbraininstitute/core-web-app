import { isNil, isNotNil } from 'es-toolkit';
import { lazy } from 'react';

import { EntityTypeDict } from '@/api/entitycore/types';
import { useFlags } from '@/features/feature-flags';
import { electrodeOverlaysFlag } from '@/features/feature-flags/flags';
import { entityConfigOf } from '@/features/logbook/api/entities';

import type { ComponentType } from 'react';
import type { FeatureFlags, FlagKey } from '@/features/feature-flags';
import type { IViewer3dProps } from '@/features/logbook/types';

// Each loads on first use, so the editor never pulls in three.js until someone asks.
const VIEWERS: Readonly<Partial<Record<string, ComponentType<IViewer3dProps>>>> = {
  [EntityTypeDict.Circuit]: lazy(
    () => import('@/features/logbook/editor/blocks/viewer-3d/circuit')
  ),
  [EntityTypeDict.CellMorphology]: lazy(
    () => import('@/features/logbook/editor/blocks/viewer-3d/morphology')
  ),
  [EntityTypeDict.Memodel]: lazy(
    () => import('@/features/logbook/editor/blocks/viewer-3d/memodel')
  ),
  [EntityTypeDict.EMCellMesh]: lazy(
    () => import('@/features/logbook/editor/blocks/viewer-3d/em-cell-mesh')
  ),
  [EntityTypeDict.SimulatableExtracellularRecordingArray]: lazy(
    () => import('@/features/logbook/editor/blocks/viewer-3d/electrode-array')
  ),
};

/** A viewer shown only while its feature flag is on. */
const FLAGGED: Readonly<Partial<Record<string, FlagKey>>> = {
  [EntityTypeDict.SimulatableExtracellularRecordingArray]: electrodeOverlaysFlag.key,
};

const viewerKeyOf = (type: string, flags: Partial<FeatureFlags>): string | null => {
  const base = entityConfigOf(type)?.type;
  if (isNil(base) || !Object.hasOwn(VIEWERS, base)) return null;
  const flag = FLAGGED[base];
  return isNil(flag) || flags[flag] === true ? base : null;
};

export const has3dView = (type: string, flags: Partial<FeatureFlags> = {}): boolean =>
  isNotNil(viewerKeyOf(type, flags));

/** The 3D view of a card's entity, picked by the EntityCore type the card's type extends. */
export function Viewer3d({ type, ...props }: IViewer3dProps & { readonly type: string }) {
  const key = viewerKeyOf(type, useFlags());
  const Viewer = isNil(key) ? null : VIEWERS[key];
  return isNil(Viewer) ? null : <Viewer {...props} />;
}

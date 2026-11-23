import { isNil, isNotNil } from 'es-toolkit';
import { lazy } from 'react';

import { EntityTypeDict } from '@/api/entitycore/types';
import { entityConfigOf } from '@/features/logbook/api/entities';

import type { ComponentType } from 'react';
import type { IViewer3dProps } from '@/features/logbook/types';

// Each loads on first use, so the editor never pulls in three.js until someone asks.
const VIEWERS: Readonly<Partial<Record<string, ComponentType<IViewer3dProps>>>> = {
  [EntityTypeDict.Circuit]: lazy(
    () => import('@/features/logbook/editor/blocks/viewer-3d/circuit')
  ),
  [EntityTypeDict.CellMorphology]: lazy(
    () => import('@/features/logbook/editor/blocks/viewer-3d/morphology')
  ),
};

const viewerKeyOf = (type: string): string | null => {
  const base = entityConfigOf(type)?.type;
  return isNotNil(base) && Object.hasOwn(VIEWERS, base) ? base : null;
};

export const has3dView = (type: string): boolean => isNotNil(viewerKeyOf(type));

/** The 3D view of a card's entity, picked by the EntityCore type the card's type extends. */
export function Viewer3d({ type, ...props }: IViewer3dProps & { readonly type: string }) {
  const key = viewerKeyOf(type);
  const Viewer = isNil(key) ? null : VIEWERS[key];
  return isNil(Viewer) ? null : <Viewer {...props} />;
}

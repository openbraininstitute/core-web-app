import { lazy } from 'react';
import { match } from 'ts-pattern';

import { EntityType } from '@/features/logbook/blocks/kinds';

import type { IProject } from '@/features/logbook/auth/session';

export interface IViewer3dProps {
  readonly entityId: string;
  readonly project: IProject;
}

// Each loads on first use, so the editor never pulls in three.js until someone asks.
const CircuitViewer = lazy(() => import('@/features/logbook/editor/blocks/viewer-3d/circuit'));
const MorphologyViewer = lazy(
  () => import('@/features/logbook/editor/blocks/viewer-3d/morphology')
);

// A card shows "View in 3D" only for these; a new type adds a line here and in Viewer3d.
const withView = new Set<string>([EntityType.Circuit, EntityType.Morphology]);

export const has3dView = (type: string): boolean => withView.has(type);

/** The 3D view of a card's entity; each type names its viewer, so nothing is picked at render. */
export function Viewer3d({ type, ...props }: IViewer3dProps & { readonly type: string }) {
  return match(type)
    .with(EntityType.Circuit, () => <CircuitViewer {...props} />)
    .with(EntityType.Morphology, () => <MorphologyViewer {...props} />)
    .otherwise(() => null);
}

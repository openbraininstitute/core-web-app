import { lazy } from 'react';

import { EntityType } from '@/features/logbook/blocks/kinds';

import type { ComponentType, LazyExoticComponent } from 'react';
import type { IProject } from '@/features/logbook/auth/session';
import type { TEntityType } from '@/features/logbook/blocks/kinds';

export interface IViewer3dProps {
  readonly entityId: string;
  readonly project: IProject;
}

// One entry per type that has a 3D view; a card shows "View in 3D" only for these.
// Each loads on first use, so the editor never pulls in three.js until someone asks.
export const viewers3d: Partial<
  Record<TEntityType, LazyExoticComponent<ComponentType<IViewer3dProps>>>
> = {
  [EntityType.Circuit]: lazy(() => import('@/features/logbook/editor/blocks/viewer-3d/circuit')),
  [EntityType.Morphology]: lazy(
    () => import('@/features/logbook/editor/blocks/viewer-3d/morphology')
  ),
};

/** The 3D view for a card's type, if it has one. */
export const viewer3dOf = (type: string) =>
  Object.hasOwn(viewers3d, type) ? viewers3d[type as TEntityType] : undefined;

import { isNil } from 'es-toolkit';
import { lazy } from 'react';

import { EntityType } from '@/features/logbook/types';

import type { ComponentType } from 'react';
import type { IViewer3dProps } from '@/features/logbook/types';

// Each loads on first use, so the editor never pulls in three.js until someone asks.
const VIEWERS: Readonly<Partial<Record<string, ComponentType<IViewer3dProps>>>> = {
  [EntityType.Circuit]: lazy(() => import('@/features/logbook/editor/blocks/viewer-3d/circuit')),
  [EntityType.Morphology]: lazy(
    () => import('@/features/logbook/editor/blocks/viewer-3d/morphology')
  ),
};

export const has3dView = (type: string): boolean => Object.hasOwn(VIEWERS, type);

/** The 3D view of a card's entity; each type names its viewer, so nothing is picked at render. */
export function Viewer3d({ type, ...props }: IViewer3dProps & { readonly type: string }) {
  const Viewer = has3dView(type) ? VIEWERS[type] : null;
  return isNil(Viewer) ? null : <Viewer {...props} />;
}

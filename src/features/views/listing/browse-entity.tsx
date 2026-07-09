'use client';

import dynamic from 'next/dynamic';

import { getEntityGridDefinition } from '@/features/data-grid/bindings/entitycore';

import { BrowseEntityScopeLegacy } from './browse-entity-legacy';

import type { ReactElement } from 'react';
import type { BrowseEntityGridProps } from '@/features/data-grid/host/browse-entity-grid';
import type { BrowseEntityScopeProps } from './browse-entity-legacy';

// AG Grid is client-only; loaded lazily like the legacy MainTable so neither
// path pays for the other's bundle.
const BrowseEntityGrid = dynamic(
  () => import('@/features/data-grid/host/browse-entity-grid').then((m) => m.BrowseEntityGrid),
  { ssr: false }
) as (props: BrowseEntityGridProps) => ReactElement | null;

export type { BrowseEntityScopeProps };

/**
 * Per-entity migration router (antd → AG Grid). A dataType registered in the
 * data-grid entitycore registry renders the new AG Grid listing; everything else
 * renders the untouched legacy antd table. Flipping an entity is one registry
 * entry; rolling it back is deleting that entry.
 */
export function BrowseEntityScope(props: BrowseEntityScopeProps) {
  const definition = getEntityGridDefinition(props.dataType);
  if (definition) {
    return <BrowseEntityGrid {...props} definition={definition} />;
  }
  return <BrowseEntityScopeLegacy {...props} />;
}

'use client';

import dynamic from 'next/dynamic';

import { getEntityGridDefinition } from '@/features/data-grid/bindings/entitycore';

import { BrowseEntityScopeLegacy } from './browse-entity-legacy';

import type { ReactElement } from 'react';
import type { IBrowseEntityGridProps } from '@/features/data-grid/host/browse-entity-grid';
import type { BrowseEntityScopeProps } from './browse-entity-legacy';

// AG Grid is client-only, and lazy so neither path pays for the other's bundle.
const BrowseEntityGrid = dynamic(
  () => import('@/features/data-grid/host/browse-entity-grid').then((m) => m.BrowseEntityGrid),
  { ssr: false }
) as (props: IBrowseEntityGridProps) => ReactElement | null;

export type { BrowseEntityScopeProps };

/**
 * Per-entity router: a dataType registered in the data-grid entitycore registry renders
 * the AG Grid listing, everything else the legacy antd table.
 */
export function BrowseEntityScope(props: BrowseEntityScopeProps) {
  const definition = getEntityGridDefinition(props.dataType);
  if (definition) {
    return <BrowseEntityGrid {...props} definition={definition} />;
  }
  return <BrowseEntityScopeLegacy {...props} />;
}

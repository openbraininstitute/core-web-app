'use client';

import dynamic from 'next/dynamic';

import { getEntityGridDefinition } from '@/features/data-grid/bindings/entitycore';
import { log } from '@/utils/logger';

import type { ReactElement } from 'react';
import type { IBrowseEntityGridProps } from '@/features/data-grid/host/browse-entity-grid';
import type { BrowseEntityScopeProps } from './types';

// AG Grid is client-only, so the listing is loaded lazily.
const BrowseEntityGrid = dynamic(
  () => import('@/features/data-grid/host/browse-entity-grid').then((m) => m.BrowseEntityGrid),
  { ssr: false }
) as (props: IBrowseEntityGridProps) => ReactElement | null;

export type { BrowseEntityScopeProps };

/**
 * Entity listing. Every routed dataType must be registered in the data-grid entitycore
 * registry — see `registry-coverage.test.ts`, which asserts exactly that for each real
 * call site. An unregistered type renders nothing rather than silently falling back to
 * a second implementation.
 */
export function BrowseEntityScope(props: BrowseEntityScopeProps) {
  const definition = getEntityGridDefinition(props.dataType);
  if (!definition) {
    log('error', `[BrowseEntityScope] no grid definition registered for "${props.dataType}"`);
    return null;
  }
  return <BrowseEntityGrid {...props} definition={definition} />;
}

'use client';

import { WarningOutlined } from '@ant-design/icons';
import dynamic from 'next/dynamic';

import { getEntityGridDefinition } from '@/features/data-grid/bindings/entitycore';
import { resolveListingVariant } from '@/features/views/listing/variants/registry';
import { useScopedListing } from '@/features/views/listing/variants/use-scoped-listing';
import { GenericError } from '@/ui/molecules/generic-error';
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
 * Entity listing. Every dataType routed here must be registered in the data-grid
 * entitycore registry.
 *
 * `registry-coverage.test.ts` asserts that for the data-browse route (against the
 * route's own exported allowlist) and for the statically-declared pickers. It cannot
 * cover every case: a scan-config picker resolves its accepted types at runtime from
 * a server-supplied schema. So an unregistered type is handled here at runtime, and
 * surfaced rather than swallowed — the alternative is a blank panel with no
 * explanation, which is how this last went unnoticed.
 */
export function BrowseEntityScope(props: BrowseEntityScopeProps) {
  const baseDefinition = props.gridDefinitionOverride ?? getEntityGridDefinition(props.dataType);
  const variant = resolveListingVariant(props.dataType, props.variantSlug);
  // The one place a variant is applied: pinned params, stripped filters, isolated state.
  const scoped = useScopedListing(props, baseDefinition, variant);

  if (!scoped.definition) {
    log('error', `[BrowseEntityScope] no grid definition registered for "${props.dataType}"`);
    return <ListingUnavailable content={`"${props.dataType}" has no grid configuration.`} />;
  }
  // An unfiltered fallback would silently load every row, the slow path a variant avoids.
  if (props.variantSlug && !variant) {
    log(
      'error',
      `[BrowseEntityScope] unknown variant "${props.variantSlug}" for "${props.dataType}"`
    );
    return (
      <ListingUnavailable content={`"${props.variantSlug}" is not a "${props.dataType}" split.`} />
    );
  }
  return (
    <BrowseEntityGrid {...props} {...scoped} definition={scoped.definition} variant={variant} />
  );
}

function ListingUnavailable({ content }: { content: string }) {
  return (
    <GenericError
      shouldContactSupport
      content={`This listing is not available: ${content}`}
      icon={<WarningOutlined className="fill-current [font-size:inherit]" />}
    />
  );
}

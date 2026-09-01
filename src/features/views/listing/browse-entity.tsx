'use client';

import { WarningOutlined } from '@ant-design/icons';
import dynamic from 'next/dynamic';

import { getEntityGridDefinition } from '@/features/data-grid/bindings/entitycore';
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
  const definition = getEntityGridDefinition(props.dataType);
  if (!definition) {
    log('error', `[BrowseEntityScope] no grid definition registered for "${props.dataType}"`);
    return (
      <GenericError
        shouldContactSupport
        content={`This listing is not available: "${props.dataType}" has no grid configuration.`}
        icon={<WarningOutlined className="fill-current [font-size:inherit]" />}
      />
    );
  }
  return <BrowseEntityGrid {...props} definition={definition} />;
}

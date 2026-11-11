'use client';

import { useSearchParams } from 'next/navigation';

import { config } from '@/config';
import {
  DATA_GROUP_QUERY_PARAM,
  SCOPE_QUERY_PARAMS,
  type TViewVariant,
  ViewVariant,
  WorkspaceSection,
} from '@/constants';
import { EntityTypeGroup } from '@/entity-configuration/domain/group';
import { createSessionStatePersistence } from '@/features/data-grid/react';
import { listingInstanceId } from '@/features/views/listing/variants/scope-listing';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { BreadcrumbChip, BreadcrumbTrail } from '@/ui/molecules/breadcrumb';
import Close from '@/ui/molecules/close';
import { useDataListStateSnapshotActions } from '@/ui/segments/data-table/elements/context';
import { makeDataKey } from '@/ui/segments/data-table/elements/helpers';
import { isBrowser } from '@/utils/environment';
import { resolveBaseEntityType, resolveConcreteEntityPathParam } from '@/utils/url-builder';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { TWorkspaceScope } from '@/constants';
import type { TEntityTypeGroup } from '@/entity-configuration/domain/group';
import type { IListingVariant } from '@/features/views/listing/variants/types';

function getGroupDisplayName(group: TEntityTypeGroup): string {
  const groupLabels: Record<TEntityTypeGroup, string> = {
    [EntityTypeGroup.Models]: 'Model',
    [EntityTypeGroup.Experimental]: 'Experimental',
    [EntityTypeGroup.Simulations]: 'Simulation',
    [EntityTypeGroup.Notebooks]: 'Notebook',
    [EntityTypeGroup.Extractions]: 'Extraction',
    [EntityTypeGroup.Processing]: 'Processing',
  };
  return groupLabels[group] || group;
}

/**
 * Data › category › type trail for the data details page, in its chip. The host passes it as the
 * top bar's `start` slot as is.
 */
export function DataBreadcrumb({
  type,
  title,
  group,
  scope,
  name,
  variant,
}: {
  /** the listing variant the entity belongs to (e.g. its circuit scale): adds a crumb after the type */
  variant?: IListingVariant;
  type: TExtendedEntitiesTypeDict;
  group: TEntityTypeGroup;
  scope: TWorkspaceScope;
  title: string;
  /** The entity's own name, trailing the trail as plain (non-clickable) text. */
  name: string;
}) {
  const { virtualLabId, projectId } = useWorkspace();
  const queryParams = useSearchParams();

  // the listing is keyed by the base type (a whole brain lists under circuit)
  const listingType = resolveBaseEntityType(type);
  const keyFor = (variantOfListing?: IListingVariant) =>
    makeDataKey({
      virtualLabId,
      projectId,
      section: WorkspaceSection.Data,
      dataType: listingType,
      scope,
      id: listingInstanceId(undefined, variantOfListing),
    }).dataKey;
  const dataKey = keyFor();

  const { reset: runStorageReset } = useDataListStateSnapshotActions({
    dataKey,
    dataType: listingType,
    section: WorkspaceSection.Data,
  });

  // a crumb = fresh listing, so clear the grid's transient session slice (filters/sort/page/
  // search) of the listing it opens only; the durable column-layout slice is left intact
  const onLinkClick = () => {
    if (!isBrowser()) return;
    runStorageReset();
    createSessionStatePersistence().clear?.(dataKey);
  };
  const onVariantLinkClick = () => {
    if (isBrowser()) createSessionStatePersistence().clear?.(keyFor(variant));
  };

  const dataHome = `${config.ROOT_ROUTE}/${virtualLabId}/${projectId}/data`;
  const typeHome = `${dataHome}/browse/entity/${resolveConcreteEntityPathParam(type)}`;
  const listingQuery = { [DATA_GROUP_QUERY_PARAM]: group, [SCOPE_QUERY_PARAMS]: scope };
  const withQuery = (path: string, set: Record<string, string> = {}) => {
    const query = new URLSearchParams(queryParams);
    for (const [key, value] of Object.entries(set)) query.set(key, value);
    const search = query.toString();
    return search ? `${path}?${search}` : path;
  };

  return (
    <BreadcrumbChip>
      <BreadcrumbTrail
        data-testid="data-view-breadcrumb"
        items={[
          { key: 'data', label: 'Data', href: withQuery(dataHome), onClick: onLinkClick },
          {
            key: 'group',
            label: getGroupDisplayName(group),
            href: withQuery(dataHome, { [DATA_GROUP_QUERY_PARAM]: group }),
            onClick: onLinkClick,
            className: 'capitalize',
          },
          {
            key: 'type',
            label: title,
            href: withQuery(typeHome, listingQuery),
            onClick: onLinkClick,
          },
          ...(variant
            ? [
                {
                  key: 'variant',
                  label: variant.label,
                  href: withQuery(`${typeHome}/${variant.slug}`, listingQuery),
                  onClick: onVariantLinkClick,
                },
              ]
            : []),
          // the entity itself is plain text: it has no listing of its own to link back to
          { key: 'entity', label: name, ellipsis: name },
        ]}
      />
    </BreadcrumbChip>
  );
}

export function ClosePage({
  url,
  variant = ViewVariant.Light,
}: {
  url: string;
  variant?: TViewVariant;
}) {
  return <Close href={url} className="mr-1" variant={variant} />;
}

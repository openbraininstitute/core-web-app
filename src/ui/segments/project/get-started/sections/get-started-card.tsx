'use client';

import { useRouter } from '@bprogress/next';
import { RiArrowRightLine } from '@remixicon/react';
import Image from 'next/image';
import Link from 'next/link';

import { config } from '@/config';
import { ScanConfigOriginSearchParam } from '@/features/scan-config/helpers';
import { createWorkflowSessionId } from '@/features/scan-config/workflow/session';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import {
  ProjectHomeResourceEntityTypeDict,
  type TProjectHomeGetStartedCard,
  type TProjectHomeResource,
} from '@/ui/segments/project/get-started/query';
import { makePathParamUrlFromExtendedType } from '@/utils/url-builder';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';

function CardMedia({ card }: { card: TProjectHomeGetStartedCard }) {
  if (card.thumbnailType === 'video' && card.video) {
    return (
      <video
        src={card.video}
        autoPlay
        muted
        loop
        playsInline
        className="h-full w-full rounded-lg object-cover"
      />
    );
  }

  if (card.image) {
    return (
      <Image
        src={card.image.url}
        alt={card.title}
        width={card.image.width}
        height={card.image.height}
        className="h-full w-full rounded-lg object-cover"
      />
    );
  }

  return (
    <div className="bg-neutral-100 flex h-full w-full items-center justify-center rounded-lg">
      <span className="text-neutral-400 text-sm">No preview</span>
    </div>
  );
}

function resolveHref(link: string, baseRoute: string): string {
  if (link.startsWith('/app/') || link.startsWith('http')) return link;
  return `${baseRoute}${link}`;
}

function resolveResourceEntityId(resource: TProjectHomeResource): string | null {
  const preferred =
    config.DEPLOYMENT_ENV === 'production' ? resource.productionLink : resource.stagingLink;
  const fallback =
    config.DEPLOYMENT_ENV === 'production' ? resource.stagingLink : resource.productionLink;

  return preferred?.trim() || fallback?.trim() || null;
}

function buildWorkflowResourceHref({
  entityId,
  targetType,
  virtualLabId,
  projectId,
}: {
  entityId: string;
  targetType: string;
  virtualLabId: string;
  projectId: string;
}): string {
  const pathParam = makePathParamUrlFromExtendedType({
    extendedType: targetType as TExtendedEntitiesTypeDict,
  }).pathParam;
  const sessionId = createWorkflowSessionId();
  const params = new URLSearchParams({ [ScanConfigOriginSearchParam]: entityId });

  return `${config.ROOT_ROUTE}/${virtualLabId}/${projectId}/workflows/simulate/configure/${pathParam}/${sessionId}?${params}`;
}

function resolveResourceHref({
  resource,
  entityId,
  virtualLabId,
  projectId,
}: {
  resource: TProjectHomeResource;
  entityId: string;
  virtualLabId: string;
  projectId: string;
}): string | null {
  switch (resource.entityType) {
    case ProjectHomeResourceEntityTypeDict.Data:
    case ProjectHomeResourceEntityTypeDict.Notebook:
      return `/app/entity/${entityId}`;
    case ProjectHomeResourceEntityTypeDict.Workflow: {
      const targetType = resource.targetType?.trim();
      if (!targetType) return null;
      return buildWorkflowResourceHref({ entityId, targetType, virtualLabId, projectId });
    }
    default:
      return `/app/entity/${entityId}`;
  }
}

const ctaClassName =
  'flex w-full shrink-0 flex-row items-center justify-between rounded-[60px] border-2 border-white/20 bg-[#002766] px-6 py-2.5 text-xl font-semibold text-white no-underline shadow-[-8px_-8px_12px_0_rgba(255,255,255,0.92),6px_8px_12px_0_rgba(0,0,0,0.12)] transition-opacity hover:opacity-90';

const resourceLinkClassName =
  'text-primary-8 flex w-full cursor-pointer items-center justify-between py-2.5 text-left text-sm font-normal no-underline transition-colors hover:opacity-80';

function ResourceItem({
  resource,
  virtualLabId,
  projectId,
}: {
  resource: TProjectHomeResource;
  virtualLabId: string;
  projectId: string;
}) {
  const router = useRouter();
  const entityId = resolveResourceEntityId(resource);

  if (!entityId) {
    return (
      <span className={resourceLinkClassName}>
        <span>{resource.label}</span>
        <RiArrowRightLine className="size-4 shrink-0" />
      </span>
    );
  }

  if (resource.entityType === ProjectHomeResourceEntityTypeDict.Workflow) {
    const targetType = resource.targetType?.trim();
    if (!targetType) {
      return (
        <span className={resourceLinkClassName}>
          <span>{resource.label}</span>
          <RiArrowRightLine className="size-4 shrink-0" />
        </span>
      );
    }

    return (
      <button
        type="button"
        className={resourceLinkClassName}
        onClick={() => {
          router.push(
            buildWorkflowResourceHref({
              entityId,
              targetType,
              virtualLabId,
              projectId,
            })
          );
        }}
      >
        <span>{resource.label}</span>
        <RiArrowRightLine className="size-4 shrink-0" />
      </button>
    );
  }

  const href = resolveResourceHref({ resource, entityId, virtualLabId, projectId });
  if (!href) {
    return (
      <span className={resourceLinkClassName}>
        <span>{resource.label}</span>
        <RiArrowRightLine className="size-4 shrink-0" />
      </span>
    );
  }

  return (
    <Link href={href} className={resourceLinkClassName}>
      <span>{resource.label}</span>
      <RiArrowRightLine className="size-4 shrink-0" />
    </Link>
  );
}

export function GetStartedCard({ card }: { card: TProjectHomeGetStartedCard }) {
  const { virtualLabId, projectId } = useWorkspace();
  const baseRoute = `${config.ROOT_ROUTE}/${virtualLabId}/${projectId}`;

  return (
    <div className="flex h-full flex-col gap-3 rounded-xl border border-neutral-300 p-5">
      <h3 className="text-primary-8 shrink-0 text-3xl font-bold">{card.title}</h3>
      <p className="text-primary-8 shrink-0 text-sm font-normal leading-normal">
        {card.description}
      </p>

      <div className="relative aspect-video w-full shrink-0 overflow-hidden rounded-lg">
        <CardMedia card={card} />
      </div>

      {card.link != null ? (
        <Link href={resolveHref(card.link, baseRoute)} className={ctaClassName}>
          {card.label}
          <RiArrowRightLine className="size-4 shrink-0" />
        </Link>
      ) : (
        <span className={ctaClassName}>
          {card.label}
          <RiArrowRightLine className="size-4 shrink-0" />
        </span>
      )}

      {card.resources && card.resources.length > 0 && (
        <ul className="flex shrink-0 flex-col">
          {card.resources.map((resource, idx) => (
            <li key={resource._key}>
              {idx > 0 && <div className="bg-neutral-300 my-0 h-px" />}
              <ResourceItem resource={resource} virtualLabId={virtualLabId} projectId={projectId} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

'use client';

import { LoadingOutlined } from '@ant-design/icons';
import { useRouter } from '@bprogress/next';
import { RiArrowRightLine } from '@remixicon/react';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';

import { useAppNotification } from '@/components/notification';
import { config } from '@/config';
import { useFlags } from '@/features/feature-flags';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { Skeleton } from '@/ui/molecules/skeleton';
import {
  ProjectHomeResourceEntityTypeDict,
  type TProjectHomeGetStartedCard,
  type TProjectHomeResource,
} from '@/ui/segments/project/get-started/query';
import { resolveWorkflowConfigureHrefForEntity } from '@/ui/segments/workflows/config/entity-entry';

import type { WorkspaceContext } from '@/types/common';

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
  const entityId =
    config.DEPLOYMENT_ENV === 'production' ? resource.productionLink : resource.stagingLink;

  return entityId?.trim() || null;
}

const ctaClassName =
  'flex w-full shrink-0 flex-row items-center justify-between rounded-[60px] border-2 border-white/20 bg-[#002766] px-6 py-2.5 text-xl font-semibold text-white no-underline shadow-[-8px_-8px_12px_0_rgba(255,255,255,0.92),6px_8px_12px_0_rgba(0,0,0,0.12)] transition-opacity hover:opacity-90';

const resourceLinkClassName =
  'text-primary-8 hover:text-primary-6 focus-visible:text-primary-6 flex w-full cursor-pointer items-center justify-between border-0 bg-transparent py-2.5 text-left text-sm font-normal shadow-none outline-none ring-0 appearance-none transition-colors hover:bg-transparent focus-visible:outline-none active:text-primary-6 disabled:cursor-wait disabled:opacity-60';

const resourceDisabledClassName =
  'text-primary-8 flex w-full cursor-default items-center justify-between border-0 bg-transparent py-2.5 text-left text-sm font-normal opacity-60';

function ResourceLabel({ label, loading }: { label: string; loading?: boolean }) {
  return (
    <>
      <span>{label}</span>
      {loading ? (
        <LoadingOutlined spin className="size-4 shrink-0" />
      ) : (
        <RiArrowRightLine className="size-4 shrink-0" />
      )}
    </>
  );
}

function ResourceItem({
  resource,
  workspace,
  flags,
}: {
  resource: TProjectHomeResource;
  workspace: WorkspaceContext;
  flags: ReturnType<typeof useFlags>;
}) {
  const router = useRouter();
  const { error: notifyError } = useAppNotification();
  const [loading, setLoading] = useState(false);
  const entityId = resolveResourceEntityId(resource);

  if (!entityId) {
    return (
      <span className={resourceDisabledClassName}>
        <ResourceLabel label={resource.label} />
      </span>
    );
  }

  const onClick = () => {
    if (loading) return;

    if (resource.entityType === ProjectHomeResourceEntityTypeDict.Notebook) {
      router.push(
        `${config.ROOT_ROUTE}/${workspace.virtualLabId}/${workspace.projectId}/notebooks/view/analysis-notebook-template/${entityId}/overview`
      );
      return;
    }

    if (resource.entityType !== ProjectHomeResourceEntityTypeDict.Workflow) {
      router.push(`/app/entity/${entityId}`);
      return;
    }

    setLoading(true);
    void resolveWorkflowConfigureHrefForEntity({ entityId, workspace, flags })
      .then((href) => {
        if (href) {
          router.push(href);
          return;
        }

        notifyError({
          message: 'Example unavailable',
          description: `No workflow configuration could be opened for "${resource.label}".`,
        });
      })
      .catch(() => {
        notifyError({
          message: 'Example unavailable',
          description: `"${resource.label}" could not be loaded. The example may not be public in this environment.`,
        });
      })
      .finally(() => {
        setLoading(false);
      });
  };

  return (
    <button type="button" className={resourceLinkClassName} disabled={loading} onClick={onClick}>
      <ResourceLabel label={resource.label} loading={loading} />
    </button>
  );
}

export function GetStartedCard({ card }: { card: TProjectHomeGetStartedCard }) {
  const flags = useFlags();
  const { virtualLabId, projectId } = useWorkspace();
  const baseRoute = `${config.ROOT_ROUTE}/${virtualLabId}/${projectId}`;
  const workspace = { virtualLabId, projectId };

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
              <ResourceItem resource={resource} workspace={workspace} flags={flags} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function GetStartedCardSkeleton() {
  return (
    <div className="flex h-full flex-col gap-3 rounded-xl border border-neutral-300 p-5">
      <Skeleton className="h-8 w-24 shrink-0" />
      <Skeleton className="h-10 w-full shrink-0" />
      <Skeleton className="aspect-video w-full shrink-0 rounded-lg" />
      <Skeleton className="h-11 w-full shrink-0 rounded-[60px]" />
      <ul className="flex shrink-0 flex-col">
        {[0, 1, 2].map((idx) => (
          <li key={idx}>
            {idx > 0 && <div className="bg-neutral-300 my-0 h-px" />}
            <div className="flex items-center justify-between py-2.5">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="size-4 shrink-0" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

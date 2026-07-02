'use client';

import { RiArrowRightLine } from '@remixicon/react';
import Image from 'next/image';
import Link from 'next/link';

import { config } from '@/config';
import { useWorkspace } from '@/ui/hooks/use-workspace';

import type { TProjectHomeGetStartedCard } from '@/ui/segments/project/get-started/query';

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

function resolveHref(link: string | null | undefined, baseRoute: string | null): string | null {
  const trimmedLink = link?.trim();
  if (!trimmedLink) return null;
  if (trimmedLink.startsWith('/app/') || trimmedLink.startsWith('http')) return trimmedLink;
  if (!baseRoute) return null;
  return `${baseRoute}${trimmedLink}`;
}

function toHref(link: string | null | undefined): string | null {
  const trimmedLink = link?.trim();
  return trimmedLink || null;
}

const ctaLinkClassName =
  'flex w-full shrink-0 flex-row items-center justify-between rounded-[60px] border-2 border-white/20 bg-[#002766] px-6 py-2.5 text-xl font-semibold text-white no-underline shadow-[-8px_-8px_12px_0_rgba(255,255,255,0.92),6px_8px_12px_0_rgba(0,0,0,0.12)] transition-opacity hover:opacity-90';

const resourceLinkClassName =
  'text-primary-8 flex items-center justify-between py-2.5 text-sm font-normal no-underline transition-colors hover:opacity-80';

export function GetStartedCard({ card }: { card: TProjectHomeGetStartedCard }) {
  const { virtualLabId, projectId } = useWorkspace();
  const baseRoute =
    virtualLabId && projectId ? `${config.ROOT_ROUTE}/${virtualLabId}/${projectId}` : null;
  const cardHref = resolveHref(card.link, baseRoute);

  return (
    <div className="flex h-full flex-col gap-3 rounded-xl border border-neutral-300 p-5">
      <h3 className="text-primary-8 shrink-0 text-3xl font-bold">{card.title}</h3>
      <p className="text-primary-8 shrink-0 text-sm font-normal leading-normal">
        {card.description}
      </p>

      <div className="relative aspect-video w-full shrink-0 overflow-hidden rounded-lg">
        <CardMedia card={card} />
      </div>

      {cardHref ? (
        <Link href={cardHref} className={ctaLinkClassName}>
          {card.label}
          <RiArrowRightLine className="size-4 shrink-0" />
        </Link>
      ) : (
        <span className={ctaLinkClassName}>
          {card.label}
          <RiArrowRightLine className="size-4 shrink-0" />
        </span>
      )}

      {card.resources && card.resources.length > 0 && (
        <ul className="flex shrink-0 flex-col">
          {card.resources.map((resource, idx) => {
            const resourceHref = toHref(resource.link);

            return (
              <li key={resource._key}>
                {idx > 0 && <div className="bg-neutral-300 my-0 h-px" />}
                {resourceHref ? (
                  <Link href={resourceHref} className={resourceLinkClassName}>
                    <span>{resource.label}</span>
                    <RiArrowRightLine className="size-4 shrink-0" />
                  </Link>
                ) : (
                  <span className={resourceLinkClassName}>
                    <span>{resource.label}</span>
                    <RiArrowRightLine className="size-4 shrink-0" />
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

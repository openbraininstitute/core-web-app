'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';

import { getClient } from '@/services/sanity/client';
import {
  DEFAULT_GET_STARTED_VIDEO_SLUG,
  ProjectHomeGetStartedQuery,
  type TProjectHomeData,
  type TTutorial,
  TutorialQuery,
} from '@/ui/segments/project/get-started/query';
import { ExploreRow } from '@/ui/segments/project/start/explore-row';
import { buildStartItems, FEATURED_KEY } from '@/ui/segments/project/start/items';
import { Shortcuts } from '@/ui/segments/project/start/shortcuts';
import { Stage } from '@/ui/segments/project/start/stage';
import { keyBuilder as keyBuilderExternal } from '@/ui/use-query-keys/third-parties';

/** Which item is on the stage, kept in the address so that a link can open on it. */
const SHOW_PARAM = 'show';

/**
 * The project's start page, after the Figma "OBI Start · Rows + tutorials & examples": the
 * platform's places on the left, a stage on the right, and below it the videos and examples
 * that can be put on that stage.
 */
export function StartPage() {
  const client = getClient();
  const searchParams = useSearchParams();
  const [selectedKey, setSelectedKey] = useState(
    () => searchParams.get(SHOW_PARAM) ?? FEATURED_KEY
  );

  const { data: home } = useQuery({
    queryKey: keyBuilderExternal.projectHomeGetStarted(),
    queryFn: () =>
      client.fetch<TProjectHomeData>(ProjectHomeGetStartedQuery, {}, { next: { revalidate: 0 } }),
  });
  const { data: tutorials } = useQuery({
    queryKey: keyBuilderExternal.discoverTutorialsList(),
    queryFn: () => client.fetch<Array<TTutorial>>(TutorialQuery, {}, { next: { revalidate: 0 } }),
  });

  const items = useMemo(
    () =>
      buildStartItems({
        featured: tutorials?.find(({ slug }) => slug === DEFAULT_GET_STARTED_VIDEO_SLUG),
        cards: home?.getStarted ?? [],
      }),
    [home, tutorials]
  );
  const selected = items.find(({ key }) => key === selectedKey) ?? items[0];

  const select = (key: string) => {
    setSelectedKey(key);
    // Not the router: a navigation would render the page again on the server.
    const url = new URL(window.location.href);
    if (key === FEATURED_KEY) url.searchParams.delete(SHOW_PARAM);
    else url.searchParams.set(SHOW_PARAM, key);
    window.history.replaceState(window.history.state, '', url);
  };

  return (
    <div className="flex min-h-full w-full flex-col gap-[24px] px-[30px] pt-[28px] pb-[24px]">
      <div className="flex w-full items-start gap-[clamp(32px,6vw,88px)]">
        <Shortcuts />
        <div className="flex min-w-0 flex-1">
          <Stage item={selected} />
        </div>
      </div>
      <ExploreRow items={items} selectedKey={selected?.key} onSelect={select} />
      <Link
        href="/"
        className="text-primary-9 self-end text-right font-serif text-[36px] leading-none"
      >
        <span className="block">Open Brain</span>
        <span className="block">Institute</span>
      </Link>
    </div>
  );
}

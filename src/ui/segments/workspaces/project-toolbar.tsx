'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { config } from '@/config';
import { WorkspaceMainPages } from '@/constants';
import { aiButtonFlag, learnFlag, useFlag } from '@/features/feature-flags';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { Wallet } from '@/ui/segments/project/balance';
import { SpaceSwitcher } from '@/ui/segments/workspaces/space-switcher';
import { AiButton } from '@/ui/segments/workspaces/top-menu';
import { cn } from '@/utils/css-class';
import { getActiveSection } from '@/utils/get-section';
import { HydrateWrapper } from '@/wrappers/hydrate-wrapper';

import type { ReactNode } from 'react';

type Section = {
  key: string;
  title: string;
  /** Under the project; `section` is the first segment that marks it active. */
  path: string;
  section: string;
};

const SECTIONS: Section[] = [
  { key: 'learn', title: 'Learn', path: WorkspaceMainPages.Learn, section: 'learn' },
  { key: 'data', title: 'Data', path: WorkspaceMainPages.Data, section: WorkspaceMainPages.Data },
  {
    key: 'workflows',
    title: 'Workflows',
    path: WorkspaceMainPages.Workflows,
    section: WorkspaceMainPages.Workflows,
  },
  {
    key: 'notebooks',
    title: 'Notebooks',
    path: `notebooks/browse/${ExtendedEntitiesTypeDict.AnalysisNotebookTemplate}`,
    section: 'notebooks',
  },
  { key: 'reports', title: 'Reports', path: WorkspaceMainPages.Reports, section: 'reports' },
  // a section of its own, last (the user asked to try it): a placeholder page for now
  { key: 'teach', title: 'Teach', path: 'teach', section: 'teach' },
];

/** The project's own pages, all under Home: its start page, team, credits and activity. */
const HOME_SECTIONS = ['', 'team', 'credits', 'activities', 'tutorials', 'quick-access'];

/** A tab's look: words alone (the user asked), in grey, the active one navy with a bar on the toolbar's line. */
const TAB =
  'group relative flex h-full shrink-0 items-center px-4 text-[14px] font-medium text-neutral-600 transition-colors hover:text-primary-9 select-none outline-none focus-visible:text-primary-9 max-[1100px]:px-2.5 max-md:w-full max-md:justify-center max-md:px-0.5 max-md:text-[12px]';
/** On a phone the tabs are along the screen's foot, so the active one's bar is on the bar's top edge. */
const TAB_ON =
  'text-primary-9 font-semibold after:absolute after:inset-x-3 after:-bottom-px after:h-[3px] after:rounded-t-full after:bg-primary-9 max-md:after:top-0 max-md:after:bottom-auto max-md:after:rounded-t-none max-md:after:rounded-b-full';

function Tab({
  on,
  title,
  className,
  children,
}: {
  on: boolean;
  title: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span className={cn('group relative flex h-full max-md:min-w-0 max-md:flex-1', className)} title={title}>
      {children}
      {/* hover underline, lighter than the active one's (none on a phone, which has no hover) */}
      {!on && (
        <span className="bg-primary-3 pointer-events-none absolute inset-x-3 -bottom-px h-[3px] scale-x-0 rounded-t-full transition-transform duration-200 group-hover:scale-x-100 max-md:hidden" />
      )}
    </span>
  );
}

/**
 * The project's top toolbar: a white bar across the top with a clear line under it. At its left your profile and
 * the lab and project switcher, in the middle the sections as tabs (the active one's bar on the line), at its right
 * the credits and the assistant: words rather than pills, the tabs without icons. No Help or Feedback.
 */
export function ProjectToolbar() {
  const { virtualLabId, projectId } = useWorkspace();
  const pathname = usePathname();
  const active = getActiveSection(pathname) ?? '';
  const learn = useFlag(learnFlag.key) === true;
  const aiButton = useFlag(aiButtonFlag.key);

  const base = `${config.ROOT_ROUTE}/${virtualLabId}/${projectId}`;
  const homePath = `${base}/`;
  const homeOn = HOME_SECTIONS.includes(active);
  // Teach with Learn, behind its flag
  const sections = SECTIONS.filter((s) => (s.key !== 'learn' && s.key !== 'teach') || learn);

  return (
    // on a phone, the logo, the switcher, the credits and the assistant along the top, and the tabs along the
    // screen's foot (the user asked)
    <header className="flex h-16 w-full items-stretch gap-5 border-b border-[#cfd5df] bg-white px-4 max-md:h-14 max-md:gap-2 max-md:px-3">
      {/* the two sides share what the tabs leave equally, so the tabs sit in the bar's middle */}
      <div className="flex min-w-0 flex-1 basis-0 items-center max-md:h-14">
        {/* no wordmark here: it is on the home's The institute category (the user asked) */}
        {/* the switcher's own box would not shrink below its width: held to what is left, its names cut short */}
        <div className="flex min-w-0 flex-1 [&>div]:max-w-full [&>div]:min-w-0">
          <SpaceSwitcher className="w-[26rem] max-w-full min-w-0" plain />
        </div>
      </div>
      <nav
        aria-label="Project"
        className="flex shrink-0 items-stretch justify-center max-md:fixed max-md:inset-x-0 max-md:bottom-0 max-md:z-40 max-md:h-[calc(3.5rem+env(safe-area-inset-bottom))] max-md:border-t max-md:border-[#cfd5df] max-md:bg-white max-md:pb-[env(safe-area-inset-bottom)] max-md:shadow-[0_-4px_14px_rgb(20_40_90/0.06)]"
      >
        <HydrateWrapper>
          <Tab on={homeOn} title="Home">
            <Link prefetch href={homePath} className={cn(TAB, homeOn && TAB_ON)}>
              Home
            </Link>
          </Tab>
          {sections.map(({ key, title, path, section }) => {
            const on = active === section;
            return (
              // no room for Teach along a phone's foot: it is in Learn there
              <Tab key={key} on={on} title={title} className={key === 'teach' ? 'max-md:hidden' : undefined}>
                <Link prefetch href={`${base}/${path}`} className={cn(TAB, on && TAB_ON)}>
                  {title}
                </Link>
              </Tab>
            );
          })}
        </HydrateWrapper>
      </nav>

      <div className="flex min-w-0 flex-1 basis-0 items-center justify-end gap-1.5 max-md:h-14 max-md:flex-none">
        <HydrateWrapper>
          <Wallet plain />
          {aiButton && (
            <span className="ml-1.5">
              <AiButton />
            </span>
          )}
        </HydrateWrapper>
      </div>
    </header>
  );
}

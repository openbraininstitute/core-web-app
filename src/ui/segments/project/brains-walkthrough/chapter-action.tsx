'use client';

import Link from 'next/link';

import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { config } from '@/config';
import { WorkspaceMainPages } from '@/constants';
import { learnFlag, useFlag } from '@/features/feature-flags';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { useWalkthroughActions } from '@/ui/segments/project/walkthrough/walkthrough';

import labs from './virtual-labs.module.css';

const PATHS = {
  data: WorkspaceMainPages.Data,
  workflows: WorkspaceMainPages.Workflows,
  notebooks: `${WorkspaceMainPages.Notebooks}/browse/${ExtendedEntitiesTypeDict.AnalysisNotebookTemplate}`,
};

type Destination = keyof typeof PATHS | 'learn' | 'platform';

/** A consistent next step, using project routes when a workspace is available. */
export function ChapterAction({ label, destination }: { label: string; destination: Destination }) {
  const { virtualLabId, projectId } = useWorkspace();
  const actions = useWalkthroughActions();
  const learn = useFlag(learnFlag.key) === true;
  const home = projectId ? `${config.ROOT_ROUTE}/${virtualLabId}/${projectId}` : '/';
  const content = (
    <>
      {label}
      <span aria-hidden="true">↗</span>
    </>
  );

  if (destination === 'platform') {
    return (
      <div className={labs.chapterAction}>
        <button type="button" onClick={actions?.enter} className={labs.button}>
          {content}
        </button>
      </div>
    );
  }

  const href =
    destination === 'learn'
      ? learn
        ? `/app/learn/brain-modeling?from=${encodeURIComponent(home + (projectId ? '?design=brains' : ''))}`
        : config.ROOT_ROUTE
      : projectId
        ? `${home}/${PATHS[destination]}`
        : config.ROOT_ROUTE;

  return (
    <div className={labs.chapterAction}>
      <Link href={href} className={labs.button}>
        {content}
      </Link>
    </div>
  );
}

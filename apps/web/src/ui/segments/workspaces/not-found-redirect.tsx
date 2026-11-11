'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { config } from '@/config';

import type { TWorkspaceMainPages } from '@/constants';
import type { WorkspaceContext } from '@/types/common';

type Props = {
  section: TWorkspaceMainPages;
  label: string;
};

/**
 * Rendered by section-scoped `not-found.tsx` boundaries when a detail URL
 * references an item that is not accessible from the current project (e.g. a
 * project-scoped entity carried over from a workspace switch, or a bad deep
 * link). Shows a short notice and replaces the URL with the section listing.
 */
export function WorkspaceNotFoundRedirect({ section, label }: Props) {
  const { virtualLabId, projectId } = useParams<WorkspaceContext>();
  const router = useRouter();
  const target = `${config.ROOT_ROUTE}/${virtualLabId}/${projectId}/${section}`;

  useEffect(() => {
    router.replace(target);
  }, [router, target]);

  return (
    <div
      data-testid="workspace-not-found-redirect"
      className="flex h-full w-full flex-col items-center justify-center gap-2 p-8 text-center"
    >
      <p className="text-primary-9 text-xl font-semibold">
        This item isn&lsquo;t available in this project
      </p>
      <p className="text-primary-8 text-base">Taking you back to {label}…</p>
    </div>
  );
}

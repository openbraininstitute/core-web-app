'use client';

import { RightOutlined } from '@ant-design/icons';
import Link from 'next/link';

import { config } from '@/config';
import { useDefaultBreakpoint } from '@/ui/hooks/create-break-point';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { Button } from '@/ui/molecules/button';

import type { WorkspaceContext } from '@/types/common';

const links = [
  {
    key: 'browse-data',
    title: 'Browse data',
    url: ({ virtualLabId, projectId }: WorkspaceContext) =>
      `${config.ROOT_ROUTE}/${virtualLabId}/${projectId}/data`,
  },
  {
    key: 'start-workflow',
    title: 'Start a workflow',
    url: ({ virtualLabId, projectId }: WorkspaceContext) =>
      `${config.ROOT_ROUTE}/${virtualLabId}/${projectId}/workflows`,
  },
  {
    key: 'run-notebook',
    title: 'Run a notebook',
    url: ({ virtualLabId, projectId }: WorkspaceContext) =>
      `${config.ROOT_ROUTE}/${virtualLabId}/${projectId}/notebooks`,
  },
];

export function Shortcuts() {
  const breakpoint = useDefaultBreakpoint();
  const { virtualLabId, projectId } = useWorkspace();
  return (
    <div className="mb-10">
      <div className="text-primary-9 mb-4 text-lg font-semibold">Would you like to: </div>
      <div className="flex grid-cols-3 flex-col items-start justify-start gap-2 lg:grid">
        {links.map(({ key, title, url }) => (
          <Button
            rounded
            borderless
            asChild
            key={key}
            variant="outline"
            className="h-auto w-full max-w-2/4 justify-start font-semibold shadow-md lg:max-w-full"
            size={breakpoint === 'xl' ? 'lg' : 'md'}
          >
            <Link prefetch href={url({ virtualLabId, projectId })}>
              {title}
              <RightOutlined className="ml-auto text-current" />
            </Link>
          </Button>
        ))}
      </div>
    </div>
  );
}

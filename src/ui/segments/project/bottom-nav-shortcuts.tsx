'use client';

import { RightOutlined } from '@ant-design/icons';
import Link from 'next/link';

import { useDefaultBreakpoint } from '@/ui/hooks/create-break-point';
import { Button } from '@/ui/molecules/button';

const links = [
  {
    key: 'browse-data',
    title: 'Browse data',
    url: 'explore',
  },
  {
    key: 'start-workflow',
    title: 'Start a workflow',
    url: 'workflows',
  },
  {
    key: 'run-notebook',
    title: 'Run a notebook',
    url: 'notebooks',
  },
];

export function Shortcuts() {
  const breakpoint = useDefaultBreakpoint();

  return (
    <div className="mb-4">
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
            <Link href={url}>
              {title}
              <RightOutlined className="ml-auto text-current" />
            </Link>
          </Button>
        ))}
      </div>
    </div>
  );
}

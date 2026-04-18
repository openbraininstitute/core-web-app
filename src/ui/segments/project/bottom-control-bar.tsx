'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { config } from '@/config';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { DEFAULT_GET_STARTED_VIDEO_SLUG } from '@/ui/segments/project/get-started/query';
import { cn } from '@/utils/css-class';

type Tab = {
  key: string;
  title: string;
  href: string;
  matcher: (pathname: string) => boolean;
};

export function BottomControlBar() {
  const pathname = usePathname();
  const { virtualLabId, projectId } = useWorkspace();
  const base = `${config.ROOT_ROUTE}/${virtualLabId}/${projectId}`;

  const tabs: Array<Tab> = [
    {
      key: 'quick-access',
      title: 'Quick Access',
      href: `${base}/quick-access/data`,
      matcher: (p) => p.includes('/quick-access'),
    },
    {
      key: 'tutorials',
      title: 'Tutorials',
      href: `${base}/tutorials/${DEFAULT_GET_STARTED_VIDEO_SLUG}`,
      matcher: (p) => p.includes('/tutorials'),
    },
  ];

  return (
    <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2">
      <div className="border-neutral-2 flex items-center gap-1 rounded-full border bg-white p-1 shadow-md">
        {tabs.map((tab) => {
          const active = tab.matcher(pathname);
          return (
            <Link
              key={tab.key}
              href={tab.href}
              className={cn(
                'select-none rounded-full px-6 py-2 text-base font-medium transition-colors',
                active ? 'bg-primary-9 text-white' : 'text-primary-9 hover:bg-neutral-1'
              )}
            >
              {tab.title}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export default BottomControlBar;

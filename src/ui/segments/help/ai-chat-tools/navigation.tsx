'use client';

import { useRouter, useSearchParams } from 'next/navigation';

import Slugify from '@/util/slugify';
import { cn } from '@/utils/css-class';

import type { AIChatToolsSectionProps } from '@/ui/segments/help/ai-chat-tools';

export default function AIChatToolsNavigation({ content }: { content: AIChatToolsSectionProps[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTool = searchParams.get('tool');

  return (
    <div className="flex w-full flex-col gap-y-2">
      <h3 className="text-primary-9 text-xs font-bold tracking-wide uppercase">Tools</h3>
      <div className="flex flex-col gap-y-1.5">
        {content?.map((tool) => {
          const isActive = activeTool === tool.id;
          return (
            <button
              type="button"
              key={tool.id}
              aria-label={`View ${tool.name} tool`}
              onClick={() => {
                const url = new URL(window.location.href);
                url.searchParams.set('tool', tool.id);
                router.replace(`${url.pathname}${url.search}`, { scroll: false });
                const el = document.getElementById(Slugify(tool.name));
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              className={cn(
                'text-primary-9 flex w-full items-center justify-between text-left text-sm',
                isActive && 'font-bold'
              )}
            >
              {tool.name}
              {isActive && <span className="bg-primary-9 h-2 w-2 rounded-full" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

'use client';

import { RightOutlined } from '@ant-design/icons';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import { Button } from '@/ui/molecules/button';
import { cn } from '@/utils/css-class';
import { buildLink } from '@/utils/searchparams-to-link';

import type { AIChatToolsSectionProps } from '@/ui/segments/help/ai-chat-tools';

export default function AIChatToolsNavigation({ content }: { content: AIChatToolsSectionProps[] }) {
  const searchParams = useSearchParams();
  const searchParamsObj = Object.fromEntries(searchParams.entries());

  const activeTool = searchParams.get('tool');

  return (
    <div className="col-span-1 flex max-h-[82vh] w-full flex-col gap-y-4 overflow-y-scroll">
      {content?.map((tool: AIChatToolsSectionProps) => {
        const link = buildLink(searchParamsObj, { tool: tool.id });
        const isActive = activeTool === tool.id;

        return (
          <Button
            rounded
            borderless
            asChild
            key={`view-${tool.id}-features`}
            variant="outline"
            className={cn(
              'shadow-base h-15 w-full justify-start px-6 text-lg font-semibold',
              isActive ? 'bg-primary-9 text-white' : ''
            )}
            aria-label={`View ${tool.name} features`}
          >
            <Link href={link.href} scroll={false}>
              {tool.name}
              <RightOutlined className="ml-auto text-current" />
            </Link>
          </Button>
        );
      })}
    </div>
  );
}

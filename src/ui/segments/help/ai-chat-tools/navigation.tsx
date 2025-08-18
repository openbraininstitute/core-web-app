import { RightOutlined } from '@ant-design/icons';

import Link from 'next/link';

import type { AIChatToolsSectionProps } from '@/ui/segments/help/ai-chat-tools';

import { Button } from '@/ui/molecules/button';

export default function AIChatToolsNavigation({
  content,
  searchParams,
}: {
  content: AIChatToolsSectionProps[];
  searchParams: Record<string, string | string[] | undefined>;
}) {
  return (
    <div className="col-span-1 flex max-h-[82vh] w-full flex-col gap-y-4 overflow-y-scroll">
      {content?.map((tool: AIChatToolsSectionProps) => {
        const isActive =
          (Array.isArray(searchParams.tool) ? searchParams.tool[0] : searchParams.tool) === tool.id;

        const params = new URLSearchParams();
        Object.entries(searchParams).forEach(([key, value]) => {
          if (Array.isArray(value)) {
            value.forEach((v) => params.append(key, v));
          } else if (value !== undefined) {
            params.set(key, value);
          }
        });
        params.set('section', 'ai-tools');
        params.set('tool', tool.id);
        const href = `?${params.toString()}`;

        return (
          <Button
            rounded
            borderless
            asChild
            key={`view-${tool.id}-features`}
            variant="outline"
            className={`shadow-base h-15 w-full justify-start px-6 text-lg font-semibold ${
              isActive ? 'bg-primary-9 text-white' : ''
            }`}
            aria-label={`View ${tool.name} features`}
          >
            <Link href={href} scroll={false}>
              {tool.name}
              <RightOutlined className="ml-auto text-current" />
            </Link>
          </Button>
        );
      })}
    </div>
  );
}

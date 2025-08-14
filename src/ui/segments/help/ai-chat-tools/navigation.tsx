import { useRouter, useSearchParams } from 'next/navigation';

import { RightOutlined } from '@ant-design/icons';
import { AIChatToolsSectionProps } from '.';

import { useDefaultBreakpoint } from '@/ui/hooks/create-break-point';
import { Button } from '@/ui/molecules/button';

export default function AIChatToolsNavigation({ content }: { content: AIChatToolsSectionProps[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const breakpoint = useDefaultBreakpoint();

  const handleClick = (id: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('ai-tool', id);
    router.push(`?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="col-span-1 flex max-h-[82vh] w-full flex-col gap-y-4 overflow-y-scroll">
      {content?.map((tool: AIChatToolsSectionProps) => (
        <Button
          rounded
          borderless
          asChild
          key={`view-${tool.id}-features`}
          variant="outline"
          className="h-auto w-full justify-start font-bold shadow-sm"
          size={breakpoint === 'xl' ? 'lg' : 'md'}
          aria-label={`View ${tool.name} features`}
        >
          <button
            type="button"
            onClick={() => handleClick(tool.id)}
            aria-label={`View ${tool.name} features`}
          >
            {tool.name}
            <RightOutlined className="ml-auto text-current" />
          </button>
        </Button>
      ))}
    </div>
  );
}

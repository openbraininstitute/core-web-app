'use client';

import { RightOutlined } from '@ant-design/icons';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import type { TutorialProps } from '@/components/documentation/type';
import { useSanityContentForTutorialsList } from '@/components/tutorials-carrousel/hooks';
import { Button } from '@/ui/molecules/button';
import { cn } from '@/utils/css-class';
import { buildLink } from '@/utils/searchparams-to-link';

export default function TutorialNavigation() {
  const tutorials = useSanityContentForTutorialsList();
  const searchParams = useSearchParams();
  const searchParamsObj = Object.fromEntries(searchParams.entries());

  let activeTutorial = searchParams.get('tutorial');
  const content =
    tutorials && !Array.isArray(tutorials) && 'tutorialOrder' in tutorials
      ? tutorials.tutorialOrder
      : [];

  if (!activeTutorial && content.length > 0) {
    activeTutorial = content[0].slug;
  }

  return (
    <div className="no-scrollbar col-span-1 flex max-h-[82vh] w-full flex-col gap-y-4 overflow-y-scroll">
      {content.map((tutorial: TutorialProps) => {
        const link = buildLink(searchParamsObj, { tutorial: tutorial.slug });
        const isActive = activeTutorial === tutorial.slug;

        return (
          <Button
            rounded
            borderless
            asChild
            key={tutorial.slug}
            variant="outline"
            className={cn(
              'shadow-base h-15 w-full justify-start px-6 text-lg font-semibold',
              isActive ? 'bg-primary-9 text-white' : '',
            )}
            aria-label={`View ${tutorial.title || 'tutorial'}`}
          >
            <Link href={link.href} scroll={false}>
              {tutorial.title || 'Untitled Tutorial'}
              <RightOutlined className="ml-auto text-current" />
            </Link>
          </Button>
        );
      })}
    </div>
  );
}

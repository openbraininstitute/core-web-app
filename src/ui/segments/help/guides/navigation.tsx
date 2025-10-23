'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import { RightOutlined } from '@ant-design/icons';

import { Button } from '@/ui/molecules/button';
import { cn } from '@/utils/css-class';
import { buildLink } from '@/utils/searchparams-to-link';

export type GuidesNavigationProps = {
  id: string;
  name: string;
};

export default function GuidesNavigation() {
  const content: GuidesNavigationProps[] = [
    {
      name: 'Build',
      id: 'build',
    },
    {
      name: 'Simulate',
      id: 'simulate',
    },
    {
      name: 'Data',
      id: 'data',
    },
  ];

  const searchParams = useSearchParams();
  const searchParamsObj = Object.fromEntries(searchParams.entries());

  const activeSubsection = searchParams.get('subsection');

  return (
    <div className="col-span-1 flex max-h-[82vh] w-full flex-col gap-y-4 overflow-y-scroll">
      {content?.map((section: GuidesNavigationProps) => {
        const link = buildLink(searchParamsObj, { subsection: section.id });
        const isActive = activeSubsection === section.id;

        return (
          <Button
            rounded
            borderless
            asChild
            key={`view-${section.id}-features`}
            variant="outline"
            className={cn(
              'shadow-base h-15 w-full justify-start px-6 text-lg font-semibold',
              isActive ? 'bg-primary-9 text-white' : ''
            )}
            aria-label={`View ${section.name} features`}
          >
            <Link href={link.href} scroll={false}>
              {section.name}
              <RightOutlined className="ml-auto text-current" />
            </Link>
          </Button>
        );
      })}
    </div>
  );
}

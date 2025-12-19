'use client';

import { RightOutlined } from '@ant-design/icons';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import { Button } from '@/ui/molecules/button';
import { cn } from '@/utils/css-class';
import { buildLink } from '@/utils/searchparams-to-link';

export type AboutNavigationProps = {
  id: string;
  name: string;
};

export default function AboutNavigation() {
  const content: AboutNavigationProps[] = [
    {
      name: 'About',
      id: 'about',
    },
    {
      name: 'Terms and condition',
      id: 'terms-and-conditions',
    },
  ];

  const searchParams = useSearchParams();
  const searchParamsObj = Object.fromEntries(searchParams.entries());

  const activeSubsection = searchParams.get('subsection') ?? 'about'; // Default to 'about'

  return (
    <div className="col-span-1 flex max-h-[82vh] w-full flex-col gap-y-4 overflow-y-scroll">
      {content?.map((section: AboutNavigationProps) => {
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
              isActive ? 'bg-primary-9 text-white' : '',
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

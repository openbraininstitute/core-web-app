'use client';

import { RightOutlined } from '@ant-design/icons';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import type { ComponentProps } from 'react';

import { useDefaultBreakpoint } from '@/ui/hooks/create-break-point';
import { Button } from '@/ui/molecules/button';
import { cn } from '@/utils/css-class';

type Props = {
  className?: ComponentProps<'div'>['className'];
};

const sections = [
  {
    key: 'description',
    title: 'Description',
    url: 'description',
  },
  {
    key: 'artifacts',
    title: 'Artifacts',
    url: 'artifacts',
  },
  {
    key: 'notebooks',
    title: 'Notebooks',
    url: 'notebooks',
  },
];

export function OBIShowcaseLeftMenu({ className }: Props) {
  const breakpoint = useDefaultBreakpoint();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeSection = searchParams.get('section') ?? 'description'; // Default to 'description'

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="flex w-full flex-col items-center justify-center gap-2">
        {sections.map(({ title, key, url }) => (
          <Button
            rounded
            borderless
            asChild
            key={key}
            variant="outline"
            className={cn(
              'h-auto w-full justify-start font-bold shadow-sm',
              activeSection === url && 'bg-primary-9 text-white'
            )}
            size={breakpoint === 'xl' ? 'lg' : 'md'}
            aria-label={activeSection === url ? 'active' : ''}
            active={activeSection === url}
          >
            <Link href={`${pathname}?section=${url}`}>
              {title}
              <RightOutlined className="ml-auto text-current" />
            </Link>
          </Button>
        ))}
      </div>
    </div>
  );
}

export default OBIShowcaseLeftMenu;

import { ReactNode } from 'react';
import NextLink from 'next/link';
import { cn } from '@/utils/css-class';

type Props = {
  children: ReactNode;
  active: 'public' | 'private';
};

export function NotebooksLayout({ children, active }: Props) {
  return (
    <div>
      <div className="mb-5 ml-5 flex">
        <NextLink
          href="public"
          className={cn(
            'flex h-[45px] min-w-[150px] items-center justify-center rounded-l-full px-4 py-2 text-white',
            active === 'public' ? 'bg-primary-9 font-bold text-white' : 'text-primary-9 bg-white'
          )}
        >
          Public
        </NextLink>

        <NextLink
          href="private"
          className={cn(
            'flex h-[45px] min-w-[150px] items-center justify-center rounded-r-full px-4 py-2 text-white',
            active === 'private' ? 'bg-primary-9 font-bold text-white' : 'text-primary-9 bg-white'
          )}
        >
          Private
        </NextLink>
      </div>
      <div
        id="notebooks-layout"
        className="bg-background border-neutral-2 ml-5 h-[calc(100vh-11rem)] rounded-2xl border p-5"
      >
        {children}
      </div>
    </div>
  );
}

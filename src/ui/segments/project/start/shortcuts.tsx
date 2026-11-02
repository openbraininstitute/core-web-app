'use client';

import Link from 'next/link';

import { config } from '@/config';
import { learnFlag, useFlag } from '@/features/feature-flags';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { cn } from '@/utils/css-class';

export interface IShortcut {
  label: string;
  icon: string;
  /** Absolute, or relative to the project when it starts without a slash. No page yet: none. */
  href?: string;
}

export interface ICategory {
  title: string;
  shortcuts: IShortcut[];
}

/** The platform's places by what they are for, the first home's "Where would you like to start?". */
export function categories({ learn }: { learn: boolean }): ICategory[] {
  return [
    {
      title: 'The institute',
      shortcuts: [
        { label: 'About', icon: 'about', href: '/about' },
        { label: 'News', icon: 'news', href: '/news' },
        { label: 'Publications', icon: 'publications', href: '/resources' },
        { label: 'Pricing', icon: 'pricing', href: '/pricing' },
      ],
    },
    {
      title: 'Learn & teach',
      shortcuts: [
        { label: 'Tutorials', icon: 'tutorials', href: 'tutorials' },
        { label: 'Free Courses', icon: 'learning', href: learn ? 'learn' : undefined },
        { label: 'Teach', icon: 'teaching' },
        { label: 'Examples', icon: 'examples', href: 'quick-access/data' },
        { label: 'Glossary', icon: 'glossary', href: '/app/documentation/glossary' },
      ],
    },
    {
      title: 'Build & analyse',
      shortcuts: [
        { label: 'Data', icon: 'data', href: 'data' },
        { label: 'Workflows', icon: 'workflows', href: 'workflows' },
        { label: 'Notebooks', icon: 'notebooks', href: 'notebooks' },
        { label: 'Virtual labs', icon: 'labs', href: config.ROOT_ROUTE },
      ],
    },
  ];
}

/** A place's address: absolute as it is, else within the project at `base`. */
export function shortcutHref(href: string, base: string): string {
  return href.startsWith('/') ? href : `${base}/${href}`;
}

const squareClassName =
  'flex h-[86px] w-[88px] shrink-0 flex-col items-center justify-center gap-[8px] rounded-[6px] border border-neutral-2 bg-white px-[5.333px]';

function Square({ shortcut, base }: { shortcut: IShortcut; base: string }) {
  const content = (
    <>
      <span className="flex size-[17.333px] items-center justify-center">
        <img src={`/images/start/icons/${shortcut.icon}.svg`} alt="" width={16} height={16} />
      </span>
      <span className="text-primary-8 w-full text-center text-[12px] leading-[14.667px] font-semibold">
        {shortcut.label}
      </span>
    </>
  );

  if (!shortcut.href) {
    return (
      <span className={cn(squareClassName, 'cursor-default')} title="Coming soon">
        {content}
      </span>
    );
  }

  const href = shortcutHref(shortcut.href, base);
  return (
    <Link
      href={href}
      className={cn(
        squareClassName,
        'transition-[border-color,box-shadow] hover:border-primary-4 hover:shadow-sm'
      )}
    >
      {content}
    </Link>
  );
}

/** "Where would you like to start?": the platform's places, a square each, by what they are for. */
export function Shortcuts() {
  const { virtualLabId, projectId } = useWorkspace();
  const learn = useFlag(learnFlag.key) === true;
  const base = `${config.ROOT_ROUTE}/${virtualLabId}/${projectId}`;

  return (
    <div className="flex w-[555px] shrink-0 flex-col gap-[26px]">
      <h1 className="text-primary-9 font-serif text-[40px] leading-[46px] whitespace-nowrap">
        Where would you like to start?
      </h1>
      <div className="flex flex-col gap-[20px]">
        {categories({ learn }).map((category) => (
          <section key={category.title} className="flex flex-col gap-[11px]">
            <h2 className="text-label text-[12px] leading-[16px] font-semibold tracking-[1.2px] uppercase">
              {category.title}
            </h2>
            <div className="flex gap-[11px]">
              {category.shortcuts.map((shortcut) => (
                <Square key={shortcut.label} shortcut={shortcut} base={base} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

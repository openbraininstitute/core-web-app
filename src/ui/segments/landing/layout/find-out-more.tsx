'use client';

import { RiArrowDownSLine, RiMenuLine } from '@remixicon/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRef } from 'react';

import { learnFonts } from '@/features/learn/fonts';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/ui/molecules/dropdown-menu';
import { MENU_ITEMS, SECTIONS } from '@/ui/segments/landing/constants';
import { informationFont } from '@/ui/segments/landing/information-font';
import { cn } from '@/utils/css-class';

import { useHeaderContrast } from './use-header-contrast';

/**
 * All the site's pages as one menu in the top bar, under the headings of its own menu; on a phone, where its words do
 * not fit beside the logo and the way in, by its mark alone. Not modal: the page goes on scrolling under it.
 */
export function FindOutMore({ shown = true }: { shown?: boolean }) {
  const trigger = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();
  const informationPage = SECTIONS.some(
    (page) => page.slug !== '/' && (pathname === page.slug || pathname.startsWith(`${page.slug}/`))
  );
  const light = useHeaderContrast(trigger);
  return (
    <div
      aria-hidden={!shown}
      inert={!shown || undefined}
      className={cn(
        'transition-opacity duration-500',
        shown ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
      )}
    >
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger
          ref={trigger}
          aria-label="Find out more"
          className={cn(
            'group flex items-center gap-[4px] text-[14px] leading-[18px] font-semibold whitespace-nowrap transition-[color,opacity] duration-300 hover:opacity-60 max-sm:-m-[9px] max-sm:p-[9px]',
            light ? 'text-white' : 'text-primary-9'
          )}
        >
          <RiMenuLine className="size-[26px] sm:hidden" />
          <span className="max-sm:hidden">Find out more</span>
          <RiArrowDownSLine className="size-[18px] transition-transform duration-200 group-data-[state=open]:rotate-180 max-sm:hidden" />
        </DropdownMenuTrigger>
        {/* Down clear of the way in, which it runs under. */}
        <DropdownMenuContent
          align="start"
          sideOffset={14}
          className={cn('border-neutral-1 z-[1000] w-44 rounded-xl bg-white p-1', learnFonts)}
          style={{
            fontFamily: informationPage
              ? informationFont.style.fontFamily
              : 'var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif',
          }}
        >
          {MENU_ITEMS.map((item) => (
            <DropdownMenuGroup key={item.caption}>
              {item.submenu && (
                <DropdownMenuLabel className="px-3 pt-2 pb-1 text-[11px] leading-[16px] font-semibold tracking-[0.12em] text-neutral-500 uppercase">
                  {item.caption}
                </DropdownMenuLabel>
              )}
              {(item.submenu ?? [item]).map((page) => (
                <DropdownMenuItem
                  key={page.slug}
                  asChild
                  className="cursor-pointer rounded-lg px-3 py-1.5 max-sm:min-h-[44px]"
                >
                  <Link href={page.slug} className="text-primary-9 text-[14px] leading-[18px]">
                    {page.caption}
                  </Link>
                </DropdownMenuItem>
              ))}
              {item.submenu && <DropdownMenuSeparator className="bg-neutral-200" />}
            </DropdownMenuGroup>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

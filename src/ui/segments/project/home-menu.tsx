'use client';

import { RiCheckLine } from '@remixicon/react';
import Link from 'next/link';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/ui/molecules/dropdown-menu';
import {
  HOME_DESIGN_CHOICES,
  HOME_MENU,
  homeDesignHref,
  useHomeDesignOnShow,
} from '@/ui/segments/project/home-designs';
import { cn } from '@/utils/css-class';

import type { ReactNode } from 'react';

/** Home as a menu of the home's designs, the one on show ticked; `children` is the button that opens it. */
export function HomeMenu({ homePath, children }: { homePath: string; children: ReactNode }) {
  const onShow = useHomeDesignOnShow(homePath);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="border-neutral-1 w-72 rounded-xl bg-white p-1">
        {HOME_MENU.map((design) => {
          const { name, note } = HOME_DESIGN_CHOICES[design];
          const on = design === onShow;
          return (
            <DropdownMenuItem key={design} asChild className="cursor-pointer rounded-lg px-3 py-2">
              <Link href={homeDesignHref(homePath, design)} className="flex items-start gap-3">
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className={cn('text-primary-9 text-[14px] leading-[18px]', on && 'font-semibold')}>
                    {name}
                  </span>
                  <span className="text-[12px] leading-[16px] text-neutral-500">{note}</span>
                </span>
                <RiCheckLine className={cn('text-primary-9 mt-[1px] size-[16px] shrink-0', !on && 'invisible')} />
              </Link>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

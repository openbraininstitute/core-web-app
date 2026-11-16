'use client';

import Link from 'next/link';

import ObiLogo from '@/features/learn/components/ui/ObiLogo';
import { ID_MENU } from '@/ui/segments/landing/constants';
import { cn } from '@/utils/css-class';

import { FindOutMore } from '../find-out-more';

import pills from '../../cta-pill.module.css';

/** Transparent top navigation shared by the information pages. */
export default function Menu({ className }: { className?: string }) {
  return (
    <header
      id={ID_MENU}
      data-testid="site-header"
      className={cn(
        'fixed inset-x-0 top-0 z-[999] flex items-start justify-between bg-transparent px-[clamp(20px,3vw,40px)] pt-[22px] pb-[10px] max-sm:px-[16px] max-sm:pt-[14px]',
        className
      )}
    >
      <Link
        href="/"
        aria-label="Open Brain Institute"
        className="inline-flex min-h-[44px] shrink-0 items-center"
      >
        <ObiLogo className="block h-[clamp(44px,5vh,56px)] w-auto text-[#002766] max-sm:h-[38px]" />
      </Link>
      <div className="flex items-center gap-[20px] max-sm:gap-[10px]">
        <FindOutMore />
        <Link
          href="/app/virtual-lab"
          data-testid="header-go-to-platform"
          className={cn(pills.pill, pills.header)}
        >
          Go to platform
        </Link>
      </div>
    </header>
  );
}

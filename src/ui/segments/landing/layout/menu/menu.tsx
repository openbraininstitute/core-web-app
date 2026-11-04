'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import ObiLogo from '@/features/learn/components/ui/ObiLogo';
import { ID_MENU } from '@/ui/segments/landing/constants';
import { cn } from '@/utils/css-class';

import { FindOutMore } from '../find-out-more';

/** The site's top bar, as the walkthrough's: its logo on the left, Find out more and the way in on the right. */
export default function Menu({ className }: { className?: string }) {
  // A line under it once the page has moved under it.
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 0);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return (
    <header
      id={ID_MENU}
      data-testid="site-header"
      className={cn(
        'fixed inset-x-0 top-0 z-[999] flex items-start justify-between border-b bg-white/90 px-[clamp(20px,3vw,40px)] pt-[22px] pb-[10px] backdrop-blur-sm transition-colors duration-300 max-sm:px-[16px] max-sm:pt-[14px]',
        scrolled ? 'border-neutral-200' : 'border-transparent',
        className
      )}
    >
      <Link href="/" aria-label="Open Brain Institute" className="shrink-0">
        <ObiLogo className="block h-[clamp(44px,5vh,56px)] w-auto text-[#002766] max-sm:h-[38px]" />
      </Link>
      <div className="flex items-center gap-[20px] max-sm:gap-[10px]">
        <FindOutMore />
        <Link
          href="/app/virtual-lab"
          data-testid="header-go-to-platform"
          className="bg-green-main rounded-full px-[22px] py-[10px] text-[14px] leading-[18px] font-semibold whitespace-nowrap text-white shadow-[0_4px_14px_rgba(0,140,5,0.25)] transition-[filter] hover:brightness-110 max-sm:px-[16px] max-sm:py-[8px] max-sm:text-[13px]"
        >
          Go to platform
        </Link>
      </div>
    </header>
  );
}

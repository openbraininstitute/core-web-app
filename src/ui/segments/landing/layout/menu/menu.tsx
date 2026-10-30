'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

import { ID_MENU } from '@/ui/segments/landing/constants';
import { EnumSection } from '@/ui/segments/landing/sections/sections';

import type { KeyboardEvent, RefObject } from 'react';

import styles from './menu.module.css';

const LINKS = [
  { label: 'Features', href: '/features', section: EnumSection.Features },
  { label: 'Pricing', href: '/pricing', section: EnumSection.Pricing },
  { label: 'News', href: '/news', section: EnumSection.News },
  { label: 'About', href: '/about', section: EnumSection.About },
  { label: 'Contact', href: '/contact', section: EnumSection.Contact },
];

interface MenuProps {
  className?: string;
  scrollHasStarted?: boolean;
  section?: EnumSection;
  isAuthenticated?: boolean;
  heroRef?: RefObject<HTMLDivElement | null>;
}

export default function Menu({
  className,
  scrollHasStarted,
  section,
  isAuthenticated = false,
  heroRef,
}: MenuProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [headerDocked, setHeaderDocked] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const docked = scrollHasStarted ?? headerDocked;

  useEffect(() => {
    if (scrollHasStarted !== undefined) return;
    const hero = heroRef?.current;
    const updateHeader = () =>
      setHeaderDocked(hero ? hero.getBoundingClientRect().bottom <= 0 : window.scrollY > 0);
    updateHeader();

    if (hero && typeof IntersectionObserver !== 'undefined') {
      const observer = new IntersectionObserver(updateHeader, { threshold: 0 });
      observer.observe(hero);
      return () => observer.disconnect();
    }

    window.addEventListener('scroll', updateHeader, { passive: true });
    window.addEventListener('resize', updateHeader);
    return () => {
      window.removeEventListener('scroll', updateHeader);
      window.removeEventListener('resize', updateHeader);
    };
  }, [heroRef, scrollHasStarted]);

  function closeMenuOnEscape(event: KeyboardEvent<HTMLElement>) {
    if (event.key === 'Escape') {
      setMenuOpen(false);
      menuButtonRef.current?.focus();
    }
  }

  return (
    <header
      id={ID_MENU}
      className={`${styles.menuContainer} ${docked ? styles.docked : ''} ${className ?? ''}`}
      data-testid="site-header"
      data-docked={docked}
    >
      <Link href="/" className={styles.logo} aria-label="Open Brain Institute home">
        <Image src="/images/obi_logo.svg" alt="Open Brain Institute" width={177} height={57} />
      </Link>
      <nav
        aria-label="Main navigation"
        id="public-navigation"
        className={menuOpen ? styles.open : undefined}
        onClick={() => setMenuOpen(false)}
        onKeyDown={closeMenuOnEscape}
      >
        {LINKS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={section === item.section ? 'page' : undefined}
            data-testid={`header-desktop-link-${item.href.slice(1)}`}
          >
            {item.label}
          </Link>
        ))}
        <Link
          className={styles.account}
          href="/app/virtual-lab/sync"
          prefetch={false}
          data-testid="header-desktop-link-app-virtual-lab"
        >
          {isAuthenticated ? 'Open Virtual Labs' : 'Sign up'}
        </Link>
      </nav>
      <button
        className={styles.menuToggle}
        aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
        aria-expanded={menuOpen}
        type="button"
        aria-controls="public-navigation"
        onClick={() => setMenuOpen(!menuOpen)}
        ref={menuButtonRef}
      >
        Menu <span aria-hidden="true">＋</span>
      </button>
    </header>
  );
}

'use client';

import Link from 'next/link';
import React, { useState } from 'react';

import { ID_MENU, MENU_ITEMS } from '@/ui/segments/landing/constants';
import { IconChevronRight } from '@/ui/segments/landing/icons/icon-chevron-right';
import { IconMenu } from '@/ui/segments/landing/icons/icon-menu';
import { classNames } from '@/util/utils';

import PopupMenu from './popup-menu/popup-menu';

import type { MenuItem } from '@/ui/segments/landing/constants';
import type { EnumSection } from '@/ui/segments/landing/sections/sections';

import styles from './menu.module.css';

interface MenuProps {
  className?: string;
  scrollHasStarted?: boolean;
  section?: EnumSection;
  scrollContainerRef?: React.RefObject<HTMLElement | null>;
}

export default function Menu({
  className,
  scrollHasStarted: scrollHasStartedProp,
  section,
  scrollContainerRef,
}: MenuProps) {
  const [showMenu, setShowMenu] = React.useState(false);
  const [showMenuComponent, setShowMenuComponent] = React.useState(true);
  const [lastScrollY, setLastScrollY] = React.useState(0);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [internalScrollStarted, setInternalScrollStarted] = React.useState(false);
  const scrollHasStarted = scrollHasStartedProp ?? internalScrollStarted;

  // Check if current section is in a submenu, and return the parent item if so
  const getParentItemForSection = (currentSection?: EnumSection): MenuItem | null => {
    if (!currentSection) return null;
    return (
      MENU_ITEMS.find((item) => {
        if (item.submenu) {
          return item.submenu.some((subItem) => subItem.index === currentSection);
        }
        return false;
      }) || null
    );
  };

  const parentItem = getParentItemForSection(section);

  React.useEffect(() => {
    const el = scrollContainerRef?.current;
    const target = el ?? window;
    const handleScroll = () => {
      const currentScrollY = el ? el.scrollTop : window.scrollY;

      setInternalScrollStarted(currentScrollY > 0);

      if (currentScrollY > lastScrollY && currentScrollY > 50) {
        setShowMenuComponent(false);
      } else if (currentScrollY < lastScrollY) {
        setShowMenuComponent(true);
      }

      setLastScrollY(currentScrollY);
    };

    target.addEventListener('scroll', handleScroll, { passive: true });

    return () => target.removeEventListener('scroll', handleScroll);
  }, [lastScrollY, scrollContainerRef]);

  return (
    <>
      <div
        id={ID_MENU}
        className={classNames(
          className,
          styles.menuContainer,
          scrollHasStarted && styles.stuck,
          !showMenuComponent && styles.hidden
        )}
        style={{
          transform: showMenuComponent ? 'translateY(0)' : 'translateY(-100%)',
          transition: 'transform 0.3s ease-in-out',
        }}
      >
        <Link href="/" className={styles.logo}>
          <h2>Open Brain Institute</h2>
        </Link>

        <div className={styles.items}>
          {MENU_ITEMS.map((item) => (
            <div key={item.slug} className={styles.menuItemContainer}>
              {item.submenu ? (
                <div
                  role="menuitem"
                  aria-haspopup="menu"
                  tabIndex={0}
                  className={styles.menuItemWithSubmenu}
                  onMouseEnter={() => setHoveredItem(item.slug)}
                  onMouseLeave={() => setHoveredItem(null)}
                >
                  <button
                    type="button"
                    className={classNames(
                      styles.menuButton,
                      (item.index === section || parentItem?.slug === item.slug) && styles.selected
                    )}
                  >
                    <span className={styles.menuButtonContent}>
                      {item.caption}
                      <span className={styles.chevron}>
                        <IconChevronRight />
                      </span>
                    </span>
                  </button>
                  <div
                    className={classNames(
                      styles.submenu,
                      hoveredItem === item.slug && styles.submenuVisible,
                      'bg-primary-8'
                    )}
                  >
                    {item.submenu.map((subItem) => (
                      <Link key={subItem.slug} href={subItem.slug} className={styles.submenuItem}>
                        {subItem.caption}
                      </Link>
                    ))}
                  </div>
                </div>
              ) : (
                <Link
                  href={item.slug}
                  className={classNames(styles.menuLink, item.index === section && styles.selected)}
                >
                  {item.caption}
                </Link>
              )}
            </div>
          ))}

          <Link href="/app/virtual-lab" className={classNames(styles.menuLink)}>
            Login
          </Link>
        </div>
        <div className={styles.hamburger}>
          <button type="button" onClick={() => setShowMenu(!showMenu)} aria-label="Popup menu">
            <IconMenu />
          </button>
        </div>
      </div>
      <PopupMenu visible={showMenu} onChange={setShowMenu} />
    </>
  );
}

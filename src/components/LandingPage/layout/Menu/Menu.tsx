'use client';

import Link from 'next/link';
import React, { useState } from 'react';

import { ID_MENU } from '../../constants';
import { IconChevronRight } from '../../icons/IconChevronRight';
import { IconMenu } from '../../icons/IconMenu';
import { EnumSection } from '../../sections/sections';
import PopupMenu from './PopupMenu/PopupMenu';

import { classNames } from '@/util/utils';
import styles from './Menu.module.css';

interface MenuProps {
  className?: string;
  scrollHasStarted: boolean;
  section?: EnumSection;
}

interface MenuItem {
  caption: string;
  slug: string;
  index?: EnumSection;
  submenu?: Array<{ caption: string; slug: string; index?: EnumSection }>;
}

const MENU_ITEMS: MenuItem[] = [
  {
    caption: 'About',
    slug: '/about',
    index: EnumSection.About,
    submenu: [
      { caption: 'Our story', slug: '/the-real-digital-brain-story', index: EnumSection.Story },
      { caption: 'Mission', slug: '/mission', index: EnumSection.Mission },
      { caption: 'Team', slug: '/team', index: EnumSection.Team },
    ],
  },
  {
    caption: 'Resources',
    slug: '/resources',
    index: EnumSection.Resources,
    submenu: [
      { caption: 'Notebooks', slug: '/resources' },
      { caption: 'Gallery', slug: '/gallery', index: EnumSection.Gallery },
    ],
  },
  {
    caption: 'The Platform',
    slug: '/pricing',
    submenu: [{ caption: 'Pricing', slug: '/pricing', index: EnumSection.Pricing }],
  },
  {
    caption: 'News',
    slug: '/news',
    index: EnumSection.News,
  },
  {
    caption: 'Contact',
    slug: '/contact',
    index: EnumSection.Contact,
  },
];

export default function Menu({ className, scrollHasStarted, section }: MenuProps) {
  const [showMenu, setShowMenu] = React.useState(false);
  const [showMenuComponent, setShowMenuComponent] = React.useState(true);
  const [lastScrollY, setLastScrollY] = React.useState(0);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

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
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY > lastScrollY && currentScrollY > 50) {
        setShowMenuComponent(false);
      } else if (currentScrollY < lastScrollY) {
        setShowMenuComponent(true);
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

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
            <div
              key={item.slug}
              className={styles.menuItemContainer}
              onMouseEnter={() => item.submenu && setHoveredItem(item.slug)}
              onMouseLeave={() => setHoveredItem(null)}
            >
              {item.submenu ? (
                <div className={styles.menuItemWithSubmenu}>
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
                      hoveredItem === item.slug && styles.submenuVisible
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

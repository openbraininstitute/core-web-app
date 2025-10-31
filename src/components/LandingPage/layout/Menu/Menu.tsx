import Link from 'next/link';
import React from 'react';

import { ID_MENU, MENU_ITEMS } from '../../constants';
import { IconMenu } from '../../icons/IconMenu';
import { EnumSection } from '../../sections/sections';
import PopupMenu from './PopupMenu';

import { classNames } from '@/util/utils';
import styles from './Menu.module.css';

interface MenuProps {
  className?: string;
  scrollHasStarted: boolean;
  section?: EnumSection;
}

export default function Menu({ className, scrollHasStarted, section }: MenuProps) {
  const [showMenu, setShowMenu] = React.useState(false);
  const [showMenuComponent, setShowMenuComponent] = React.useState(true);
  const [lastScrollY, setLastScrollY] = React.useState(0);

  React.useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY > lastScrollY && currentScrollY > 50) {
        // Scrolling down
        setShowMenuComponent(false);
      } else if (currentScrollY < lastScrollY) {
        // Scrolling up
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
          {MENU_ITEMS.map(({ caption, index, slug }) => (
            <Link
              key={slug}
              href={slug}
              className={classNames(index === section && styles.selected)}
            >
              {caption}
            </Link>
          ))}

          <Link href="/app/virtual-lab" className={styles.loginButton}>
            Virtual Labs
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

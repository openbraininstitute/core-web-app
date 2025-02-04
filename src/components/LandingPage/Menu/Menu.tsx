import React from 'react';

import { useAtom } from 'jotai';
import { IconMenu } from '../icons/IconMenu';
import { atomSection, EnumSection } from '../sections/sections';
import { HEAD_LINKS } from './data';
import PopupMenu from './PopupMenu';
import HeaderLoginButton from './HeaderLoginButton';
import { classNames } from '@/util/utils';

import styles from './Menu.module.css';

export interface MenuProps {
  className?: string;
}

export default function Menu({ className }: MenuProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [stuck, setStuck] = React.useState(false);
  React.useEffect(() => {
    const div = ref.current;
    if (!div) return;

    const observer = new IntersectionObserver(([e]) => setStuck(e.intersectionRatio < 1), {
      threshold: [1],
    });
    observer.observe(div);
    return () => observer.unobserve(div);
  }, []);
  const [showMenu, setShowMenu] = React.useState(false);
  const [section, setSection] = useAtom(atomSection);

  return (
    <>
      <div className={styles.menuContainer} ref={ref}>
        <div className={classNames(className, styles.menu, stuck && styles.stuck)}>
          <button
            type="button"
            className={classNames(styles.logo, section === EnumSection.Home && styles.selected)}
            onClick={() => setSection(EnumSection.Home)}
          >
            <div>Open Brain Institute</div>
          </button>
          <div className={styles.items}>
            {HEAD_LINKS.map(({ caption, index }) => {
              return (
                <button
                  type="button"
                  className={classNames(index === section && styles.selected)}
                  key={caption}
                  onClick={() => setSection(index)}
                >
                  <div>{caption}</div>
                </button>
              );
            })}
            <button type="button" aria-label="Log in" className={styles.loginButton}>
              <HeaderLoginButton stuck={stuck} />
            </button>
          </div>
          <div className={styles.hamburger}>
            <button type="button" onClick={() => setShowMenu(!showMenu)}>
              <div>Menu</div>
              <IconMenu />
            </button>
          </div>
        </div>
      </div>
      <PopupMenu visible={showMenu} onChange={setShowMenu} onClick={setSection} />
    </>
  );
}

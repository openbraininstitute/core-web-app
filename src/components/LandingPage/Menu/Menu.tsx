import React from 'react';

import { useAtom } from 'jotai';
import { IconPlus } from '../icons/IconPlus';
import { IconMenu } from '../icons/IconMenu';
import { atomSection, EnumSection } from '../sections/sections';
import { classNames } from '@/util/utils';

import styles from './Menu.module.css';

export interface MenuProps {
  className?: string;
}

const HEAD_LINKS: Array<{ caption: string; index: EnumSection }> = [
  // { caption: 'The institute', index: EnumSection.Institute },
  { caption: 'Our mission', index: EnumSection.OurMission },
  { caption: 'Pricing', index: EnumSection.Pricing },
  { caption: 'Our team', index: EnumSection.OurTeam },
  { caption: 'Contact', index: EnumSection.Contact },
];

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
    <div ref={ref} className={classNames(className, styles.menu, stuck && styles.stuck)}>
      <button type="button" className={styles.logo} onClick={() => setSection(EnumSection.Home)}>
        <div>{`Open Brain\nInstitute`}</div>
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
              <IconPlus />
            </button>
          );
        })}
      </div>
      <div className={styles.hamburger}>
        <button type="button" onClick={() => setShowMenu(!showMenu)}>
          <div>Menu</div>
          <IconMenu />
        </button>
      </div>
      <menu className={classNames(showMenu && styles.showMenu)}>
        {HEAD_LINKS.map(({ caption, index }) => (
          <button
            type="button"
            className={classNames(index === section && styles.selected)}
            key={caption}
            onClick={() => {
              setSection(index);
              setShowMenu(false);
            }}
          >
            <div>{caption}</div>
            <IconPlus />
          </button>
        ))}
      </menu>
    </div>
  );
}

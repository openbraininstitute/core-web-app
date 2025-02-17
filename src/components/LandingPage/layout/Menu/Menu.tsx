import React from 'react';

import { IconMenu } from '../../icons/IconMenu';
import { EnumSection } from '../../sections/sections';
import { ID_MENU, MENU_ITEMS } from '../../constants';
import { gotoSection } from '../../utils';
import PopupMenu from './PopupMenu';
import { classNames } from '@/util/utils';

import styles from './Menu.module.css';

export interface MenuProps {
  className?: string;
  scrollHasStarted: boolean;
  section: EnumSection;
}

export default function Menu({ className, scrollHasStarted, section }: MenuProps) {
  const [showMenu, setShowMenu] = React.useState(false);

  return (
    <>
      <div
        id={ID_MENU}
        className={classNames(className, styles.menuContainer, scrollHasStarted && styles.stuck)}
      >
        <button
          type="button"
          className={classNames(styles.logo)}
          onClick={() => gotoSection(EnumSection.Home)}
        >
          <h2>Open Brain Institute</h2>
        </button>
        <div className={styles.items}>
          {MENU_ITEMS.map(({ caption, index }) => {
            return (
              <button
                type="button"
                className={classNames(index === section && styles.selected)}
                key={caption}
                onClick={() => gotoSection(index)}
              >
                <div>{caption}</div>
              </button>
            );
          })}
          <button type="button" aria-label="Log in" className={styles.loginButton}>
            <div>Login to the Platform</div>
          </button>
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

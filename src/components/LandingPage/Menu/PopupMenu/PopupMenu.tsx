import React from 'react';

import { HEAD_LINKS } from '../data';
import { EnumSection } from '../../sections/sections';
import LoginButton from '../../buttons/LoginButton/LoginButton';
import { IconClose } from '../../icons/IconClose';
import { classNames } from '@/util/utils';

import styles from './PopupMenu.module.css';

const MENU_LINKS = [{ caption: 'Home', index: EnumSection.Home }, ...HEAD_LINKS];

export interface PopupMenuProps {
  className?: string;
  visible: boolean;
  onChange(visible: boolean): void;
  onClick(section: EnumSection): void;
}

export default function PopupMenu({ className, visible, onChange, onClick }: PopupMenuProps) {
  return (
    <button
      type="button"
      className={classNames(className, styles.popupMenu, visible && styles.show)}
      onClick={() => onChange(false)}
    >
      <menu>
        <header>
          <button
            className={styles.close}
            type="button"
            aria-label="Close popup menu"
            onClick={() => onChange(false)}
          >
            <IconClose />
          </button>
        </header>
        <section>
          {MENU_LINKS.map(({ caption, index }) => (
            <button
              type="button"
              key={caption}
              onClick={() => {
                onClick(index);
                onChange(false);
              }}
            >
              <div>{caption}</div>
            </button>
          ))}
        </section>
        <LoginButton />
      </menu>
    </button>
  );
}

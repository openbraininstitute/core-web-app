/* eslint-disable jsx-a11y/no-noninteractive-element-interactions */
import React from 'react';

import { MENU_ITEMS } from '../../../constants';
import LoginButton from '../../../components/buttons/LoginButton/LoginButton';
import { IconClose } from '../../../icons/IconClose';
import { classNames } from '@/util/utils';
import { gotoSection } from '@/components/LandingPage/utils';

import styles from './PopupMenu.module.css';

const MENU_LINKS = [...MENU_ITEMS];

export interface PopupMenuProps {
  className?: string;
  visible: boolean;
  onChange(visible: boolean): void;
}

export default function PopupMenu({ className, visible, onChange }: PopupMenuProps) {
  return (
    <div
      className={classNames(className, styles.popupMenu, visible && styles.show)}
      onClick={() => onChange(false)}
      role="dialog"
      onKeyDown={(evt) => {
        if (evt.key === 'Escape') onChange(false);
      }}
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
                onChange(false);
                gotoSection(index);
              }}
            >
              <div>{caption}</div>
            </button>
          ))}
        </section>
        <LoginButton />
      </menu>
    </div>
  );
}

/* eslint-disable jsx-a11y/no-noninteractive-element-interactions */
import React from 'react';

import Link from 'next/link';
import { DEFAULT_SECTION, MENU_ITEMS } from '../../../constants';
import { IconClose } from '../../../icons/IconClose';
import { classNames } from '@/util/utils';

import { EnumSection } from '@/components/LandingPage/sections/sections';
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
          {[
            DEFAULT_SECTION,
            ...MENU_LINKS,
            {
              index: EnumSection.ComingSoon,
              caption: 'Login to the platform',
              slug: 'coming-soon',
            },
          ].map(({ caption, slug }) => (
            <Link
              className={styles.link}
              type="button"
              key={caption}
              onClick={() => {
                onChange(false);
              }}
              href={slug}
            >
              <div>{caption}</div>
            </Link>
          ))}
        </section>
        {/* <LoginButton /> */}
      </menu>
    </div>
  );
}

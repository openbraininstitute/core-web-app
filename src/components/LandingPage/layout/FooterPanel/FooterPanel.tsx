import React from 'react';

import { EnumSection } from '../../sections/sections';
import { MENU_ITEMS } from '../../constants';
import { gotoSection } from '../../utils';
import SocialMediaLinks from '../../components/social-media-links';
import NewsLetterSubscription from './NewsLetterSubscription';
import { classNames } from '@/util/utils';

import styles from './FooterPanel.module.css';

export interface FooterPanelProps {
  className?: string;
}

export default function FooterPanel({ className }: FooterPanelProps) {
  return (
    <>
      <div className={classNames(className, styles.footerPanel)}>
        <div className={styles.title}>
          <h2>Open Brain Institute</h2>
          <div className={styles.copyright}>Copyright © 2025 - Open Brain Institute</div>
        </div>
        <div className={styles.links}>
          {MENU_ITEMS.map(({ caption, index }) => (
            <Section key={caption} section={index}>
              {caption}
            </Section>
          ))}
          <Section section={EnumSection.TermsAndConditions}>Terms and conditions</Section>
          <Section section={EnumSection.PrivacyPolicy}>Privacy policy</Section>
          <div className={styles.socialmedia}>
            <SocialMediaLinks />
          </div>
        </div>
        <NewsLetterSubscription className={styles.subscribe} onSectionChange={gotoSection} />
      </div>
    </>
  );
}

function Section({ section, children }: { section: EnumSection; children: string }) {
  return (
    <div className={styles.section}>
      <button type="button" onClick={() => gotoSection(section)}>
        {children}
      </button>
    </div>
  );
}

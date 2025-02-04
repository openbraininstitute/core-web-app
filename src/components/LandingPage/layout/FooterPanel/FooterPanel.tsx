import React from 'react';

import VerticalRuler from '../../components/VerticalRuler';
import { EnumSection } from '../../sections/sections';
import { MENU_ITEMS } from '../../constants';
import { gotoSection } from '../../utils';
import IconLinkedin from './icons/iconLinkedin';
import IconTwitter from './icons/iconTwitter';
import IconBlueSky from './icons/iconBlueSky';
import NewsLetterSubscription from './NewsLetterSubscription';
import { classNames } from '@/util/utils';

import styles from './FooterPanel.module.css';

export interface FooterPanelProps {
  className?: string;
}

export default function FooterPanel({ className }: FooterPanelProps) {
  return (
    <>
      <VerticalRuler />
      <div className={classNames(className, styles.footerPanel)}>
        <div className={styles.title}>
          <h2>Open Brain Institute</h2>
          <div>Copyright © 2025 - Open Brain Institute</div>
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
            {/* <a>Discord</a> */}
            <a href="https://www.linkedin.com/company/openbraininstitute/">
              <IconLinkedin className="mr-2 h-auto w-6" /> <span>Linkedin</span>
            </a>
            <a href="https://x.com/OpenBrainInst">
              <IconTwitter className="mr-2 h-auto w-6" /> <span>X</span>
            </a>
            {/* <a>Youtube</a> */}
            <a href="https://bsky.app/profile/openbraininst.bsky.social">
              <IconBlueSky className="mr-2 h-auto w-6" />
              <span>BlueSky</span>
            </a>
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

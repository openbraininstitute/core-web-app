import React from 'react';

import { useSetAtom } from 'jotai';
import VerticalRuler from '../VerticalRuler';
import { atomSection, EnumSection } from '../sections/sections';
import IconLinkedin from './icons/iconLinkedin';
import IconTwitter from './icons/iconTwitter';
import IconBlueSky from './icons/iconBlueSky';
import { classNames } from '@/util/utils';

import styles from './FooterPanel.module.css';

export interface FooterPanelProps {
  className?: string;
}

export default function FooterPanel({ className }: FooterPanelProps) {
  const setSection = useSetAtom(atomSection);

  return (
    <>
      <VerticalRuler />
      <div className={classNames(className, styles.footerPanel)}>
        <div className={styles.title}>
          <div>Open Brain Institute</div>
          <div>Open Brain Institute – Copyright 2025</div>
        </div>
        <div className={styles.links}>
          {/* <Section section={EnumSection.Institute} setSection={setSection}>
            The institute
          </Section> */}
          <Section section={EnumSection.OurMission} setSection={setSection}>
            Our mission
          </Section>
          <Section section={EnumSection.Pricing} setSection={setSection}>
            Pricing
          </Section>
          <Section section={EnumSection.OurTeam} setSection={setSection}>
            Our team
          </Section>
          <Section section={EnumSection.TermsAndConditions} setSection={setSection}>
            Terms and conditions
          </Section>
          <Section section={EnumSection.Contact} setSection={setSection}>
            Contact
          </Section>
          <div>
            {/* <a>Discord</a> */}
            <a href="https://www.linkedin.com/company/openbraininstitute/">
              <IconLinkedin iconColor="#003381" className="mr-2 h-auto w-6" /> Linkedin
            </a>
            <a href="https://x.com/OpenBrainInst">
              <IconTwitter iconColor="#003381" className="mr-2 h-auto w-6" /> X
            </a>
            {/* <a>Youtube</a> */}
            <a href="https://bsky.app/profile/openbraininst.bsky.social">
              <IconBlueSky iconColor="#003381" className="mr-2 h-auto w-6" />
              BlueSky
            </a>
          </div>
        </div>
        {/* <div className={styles.subscribe}>
                <div>
                    <div>Subscribe to our latest release news</div>
                    <input placeholder="Enter your email here..."></input>
                    <button type="button">Subscribe</button>
                </div>
            </div> */}
      </div>
    </>
  );
}

function Section({
  section,
  setSection,
  children,
}: {
  section: EnumSection;
  setSection: (section: EnumSection) => void;
  children: string;
}) {
  return (
    <div>
      <button type="button" onClick={() => setSection(section)}>
        {children}
      </button>
    </div>
  );
}

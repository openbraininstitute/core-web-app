import Link from 'next/link';

import { classNames } from '@/util/utils';

import SocialMediaLinks from '../../components/social-media-links';
import { getSection } from '../../utils';
import NewsLetterSubscription from './NewsLetterSubscription';

import styles from './FooterPanel.module.css';

interface FooterPanelProps {
  className?: string;
}

interface FooterLink {
  label: string;
  href: string;
}

const FOOTER_LINKS: FooterLink[] = [
  { label: 'About OBI', href: '/about' },
  { label: 'Our story', href: '/the-real-digital-brain-story' },
  { label: 'Mission', href: '/mission' },
  { label: 'Team', href: '/team' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Features', href: '/features' },
  { label: 'Showcases', href: '/showcases' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'News', href: '/news' },
  { label: 'Contact', href: '/contact' },
  { label: 'Login', href: '/app/virtual-lab' },
  { label: 'Terms and conditions', href: '/terms' },
  { label: 'Financing policy', href: '/financing' },
  { label: 'Privacy policy', href: '/privacy' },
];

export default function FooterPanel({ className }: FooterPanelProps) {
  return (
    <div className={classNames(className, styles.footerPanel)}>
      <div className={styles.title}>
        <h2>Open Brain Institute</h2>
        <div className={styles.copyright}>
          Copyright © {new Date().getFullYear()} - Open Brain Institute
        </div>
      </div>
      <div className={styles.links}>
        {FOOTER_LINKS.map((link) => (
          <div key={link.href} className={styles.section}>
            <Link href={link.href}>{link.label}</Link>
          </div>
        ))}
        <div className={styles.socialmedia}>
          <SocialMediaLinks />
        </div>
      </div>
      <NewsLetterSubscription
        className={styles.subscribe}
        onSectionChange={(section) => {
          const sectionData = getSection(section);
          window.location.href = sectionData.slug;
        }}
      />
    </div>
  );
}

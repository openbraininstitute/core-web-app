import Link from 'next/link';

import SocialMediaLinks from '@/ui/segments/landing/components/social-media-links/social-media-links';
import { classNames } from '@/util/utils';

import NewsLetterSubscription from './newsletter-subscription';

import type { ContentForSocialMediaLink } from '@/services/sanity/api/get-social-media';

import styles from './footer-panel.module.css';

interface FooterPanelProps {
  className?: string;
  socialMediaLinks: ContentForSocialMediaLink[];
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
  { label: 'Gallery', href: '/gallery' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'News', href: '/news' },
  { label: 'Contact', href: '/contact' },
  { label: 'Login', href: '/app/virtual-lab' },
  { label: 'Terms and conditions', href: '/terms' },
  { label: 'Financing policy', href: '/financing' },
  { label: 'Privacy policy', href: '/privacy' },
];

export default function FooterPanel({ className, socialMediaLinks }: FooterPanelProps) {
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
          <SocialMediaLinks links={socialMediaLinks} />
        </div>
      </div>
      <NewsLetterSubscription className={styles.subscribe} />
    </div>
  );
}

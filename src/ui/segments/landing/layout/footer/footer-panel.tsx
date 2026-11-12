import Link from 'next/link';

import SocialMediaLinks from '@/ui/segments/landing/components/social-media-links/social-media-links';
import { informationFont } from '@/ui/segments/landing/information-font';
import { classNames } from '@/util/utils';

import NewsletterDisclosure from './newsletter-disclosure';
import NewsLetterSubscription from './newsletter-subscription';

import type { ContentForSocialMediaLink } from '@/services/sanity/api/get-social-media';

import styles from './footer-panel.module.css';

interface FooterPanelProps {
  className?: string;
  socialMediaLinks: ContentForSocialMediaLink[];
}

const FOOTER_LINKS = [
  { label: 'About OBI', href: '/about' },
  { label: 'Team', href: '/team' },
  { label: 'Features', href: '/features' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'News', href: '/news' },
  { label: 'Contact', href: '/contact' },
];

const LEGAL_LINKS = [
  { label: 'Privacy', href: '/privacy' },
  { label: 'Terms', href: '/terms' },
  { label: 'Financing policy', href: '/financing' },
];

export default function FooterPanel({ className, socialMediaLinks }: FooterPanelProps) {
  return (
    <footer
      className={classNames(className, informationFont.variable, styles.footerPanel)}
      data-testid="site-footer"
    >
      <div className={styles.main}>
        <div className={styles.identity}>
          <Link href="/" className={styles.brand}>
            Open Brain Institute
          </Link>
          <small className={styles.copyright}>© {new Date().getFullYear()}</small>
        </div>
        <nav className={styles.links} aria-label="Footer navigation">
          {FOOTER_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              data-testid={`footer-link-${link.href.slice(1).replaceAll('/', '-')}`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className={styles.bottom}>
        <nav className={styles.legal} aria-label="Legal information">
          {LEGAL_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              data-testid={`footer-link-${link.href.slice(1)}`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className={styles.actions}>
          <SocialMediaLinks className={styles.socialmedia} links={socialMediaLinks} />
          <NewsletterDisclosure className={styles.newsletter}>
            <summary>
              Subscribe for updates
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path
                  d="m4 6 4 4 4-4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </summary>
            <NewsLetterSubscription className={styles.subscribe} />
          </NewsletterDisclosure>
        </div>
      </div>
    </footer>
  );
}

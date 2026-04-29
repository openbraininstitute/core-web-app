import { classNames } from '@/util/utils';

import ProgressiveImage from '../progressive-image/progressive-image';

import type { ContentForSocialMediaLink } from '@/services/sanity/api/get-social-media';

import styles from './social-media-links.module.css';

interface SocialMediaLinksProps {
  className?: string;
  links: ContentForSocialMediaLink[];
}

export default function SocialMediaLinks({ className, links }: SocialMediaLinksProps) {
  return (
    <div className={classNames(className, styles.socialMediaLinks)}>
      {links.map((link) => (
        <a key={link.url} href={link.url} target="_BLANK">
          <ProgressiveImage
            className={styles.image}
            background="transparent"
            forceAspectRatio
            src={link.imageURL}
            width={link.imageWidth}
            height={link.imageHeight}
          />
          <div className={styles.title}>{link.title}</div>
        </a>
      ))}
    </div>
  );
}

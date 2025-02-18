import React from 'react';

import ProgressiveImage from '../ProgressiveImage';
import { useSanityContentForSocialMediaLinks } from './hooks';
import { classNames } from '@/util/utils';

import styles from './social-media-links.module.css';

export interface SocialMediaLinksProps {
  className?: string;
}

export default function SocialMediaLinks({ className }: SocialMediaLinksProps) {
  const links = useSanityContentForSocialMediaLinks();

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

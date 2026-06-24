import Link from 'next/link';

import ProgressiveImage from '@/ui/segments/landing/components/progressive-image/progressive-image';

import type { ContentForPortalsListItem } from '@/services/sanity/api/get-portals-content';

import styles from './portal-card.module.css';

type PortalCardProps = {
  value: ContentForPortalsListItem;
};

export default function PortalCard({ value }: PortalCardProps) {
  const { title, description, link, imageURL, imageWidth, imageHeight } = value;

  return (
    <Link href={link} className={styles.card} target="_BLANK">
      <div className={styles.content}>
        <div>
          <div>Portal</div>
          <h2>{title}</h2>
        </div>
        <div>{description}</div>
      </div>
      <div className={styles.pictureContainer}>
        <ProgressiveImage
          src={imageURL}
          alt={title}
          width={imageWidth}
          height={imageHeight}
          className={styles.picture}
        />
      </div>
    </Link>
  );
}

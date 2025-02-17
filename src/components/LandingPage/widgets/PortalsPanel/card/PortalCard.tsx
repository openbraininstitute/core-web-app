import Link from 'next/link';

import { ContentForPortalsListItem } from '@/components/LandingPage/content/portals';
import ProgressiveImage from '@/components/LandingPage/components/ProgressiveImage';

import styles from './PortalCard.module.css';

export type PortalCardProps = {
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

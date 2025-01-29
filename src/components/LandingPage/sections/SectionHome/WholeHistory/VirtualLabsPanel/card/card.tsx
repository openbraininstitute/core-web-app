import Image, { StaticImageData } from 'next/image';

import styles from './card.module.css';

export type SingleSectionCardProps = {
  index: number;
  title: string;
  description: string;
  image: StaticImageData;
};

export function SingleSectionCard({ index, title, description, image }: SingleSectionCardProps) {
  return (
    <button className={`${styles.card} bg-neutral-1`} type="button">
      <Image className={styles.background} src={image} alt={title} width="900" height="600" />
      <div className={styles.content}>
        <div>
          <h3>0{index + 1}</h3>
          <h2>{title}</h2>
        </div>
        <div>{description}</div>
      </div>
    </button>
  );
}

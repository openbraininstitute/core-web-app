import Image, { StaticImageData } from 'next/image';
import Link from 'next/link';

import styles from './PortalCard.module.css';

export type PortalCardProps = {
  title: string;
  content: string;
  image: StaticImageData;
  href: string;
};

export default function PortalCard({ title, content, image, href }: PortalCardProps) {
  return (
    <Link href={href} className={styles.card} target="_BLANK">
      <div className={styles.content}>
        <div>
          <div className="text-base uppercase tracking-wider">Portal</div>
          <h2 className="mb-12 font-serif text-3xl font-normal leading-tight">{title}</h2>
        </div>
        <div>{content}</div>
      </div>
      <Image src={image} alt={title} width="800" height="800" className={styles.picture} />
    </Link>
  );
}

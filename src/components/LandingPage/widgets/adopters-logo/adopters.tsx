import Image from 'next/image';

import { classNames } from '@/util/utils';

import { useSanityContentForAdopters } from '../../content/adopters';
import { styleBlockFullWidth } from '../../styles';

import styles from './adopters.module.css';

interface WidgetAdoptersLogoProps {
  className?: string;
}

export default function WidgetAdoptersLogo({ className }: WidgetAdoptersLogoProps) {
  const adopters = useSanityContentForAdopters();

  return (
    <div className={classNames(className, styles.root, styleBlockFullWidth)}>
      <h2 className={styles.title}>Early adopters</h2>
      <div className={styles.logos}>
        {adopters.map((adopter) => (
          <a
            key={`${adopter.name}-${adopter.url}`}
            className={styles.link}
            href={adopter.url}
            rel="noopener noreferrer"
            target="_blank"
            title={adopter.name}
          >
            <Image
              alt={adopter.name}
              className={styles.logoImage}
              height={adopter.imageHeight}
              src={adopter.imageURL}
              width={adopter.imageWidth}
            />
          </a>
        ))}
      </div>
    </div>
  );
}

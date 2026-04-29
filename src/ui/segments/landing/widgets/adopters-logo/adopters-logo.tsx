import Image from 'next/image';
import { Fragment } from 'react';

import { styleBlockFullWidth } from '@/ui/segments/landing/styles';
import { classNames } from '@/util/utils';

import type { ContentForAdopterItem } from '@/services/sanity/api/get-adopters-content';

import styles from './adopters-logo.module.css';

interface WidgetAdoptersLogoProps {
  data: ContentForAdopterItem[];
  className?: string;
}

export default function WidgetAdoptersLogo({ data, className }: WidgetAdoptersLogoProps) {
  return (
    <div className={classNames(className, styles.root, styleBlockFullWidth)}>
      <div className={styles.inner}>
        <h2 className={styles.title}>Early adopters</h2>
        <div className={styles.logos}>
          {data.map((adopter) => {
            const key = `${adopter.name}-${adopter.imageURL}-${adopter.url}`;
            const logo = (
              <Image
                alt={adopter.name}
                className={styles.logoImage}
                height={adopter.imageHeight}
                src={adopter.imageURL}
                width={adopter.imageWidth}
              />
            );
            return (
              <Fragment key={key}>
                {adopter.url ? (
                  <a
                    className={styles.link}
                    href={adopter.url}
                    rel="noopener noreferrer"
                    target="_blank"
                    title={adopter.name}
                  >
                    {logo}
                  </a>
                ) : (
                  <span className={styles.link} title={adopter.name}>
                    {logo}
                  </span>
                )}
              </Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}

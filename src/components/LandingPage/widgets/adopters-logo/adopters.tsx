import Image from 'next/image';
import { Fragment } from 'react';

import { classNames } from '@/util/utils';

import { useSanityContentForAdopters } from '../../content/adopters';
import { styleBlockFullWidth } from '../../styles';

import styles from './adopters.module.css';

export type WidgetAdoptersLogoProps = {
  className?: string;
};

export default function WidgetAdoptersLogo({ className }: WidgetAdoptersLogoProps) {
  const adopters = useSanityContentForAdopters();

  return (
    <div className={classNames(className, styles.root, styleBlockFullWidth)}>
      <div className={styles.inner}>
        <h2 className={styles.title}>Early adopters</h2>
        <div className={styles.logos}>
          {adopters.map((adopter) => {
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

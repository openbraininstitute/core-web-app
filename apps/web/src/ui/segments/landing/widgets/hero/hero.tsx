import Link from 'next/link';
import React from 'react';

import ProgressiveImage from '@/ui/segments/landing/components/progressive-image/progressive-image';
import { Text } from '@/ui/segments/landing/components/text/text';
import { styleBlockMedium, styleLayout } from '@/ui/segments/landing/styles';
import { getSection } from '@/ui/segments/landing/utils';
import { classNames } from '@/util/utils';

import type { ContentForWidgetHero } from '@/services/sanity/api/get-widget-hero';

import styles from './hero.module.css';

interface WidgetHeroProps {
  className?: string;
  data: ContentForWidgetHero | null;
}

export function WidgetHero({ className, data }: WidgetHeroProps) {
  if (!data) return null;

  const { title, text, button, background } = data;

  return (
    <div
      className={classNames(className, styles.hero, styleLayout)}
      style={{
        '--custom-aspect-ratio': background ? `${background.width}/${background.height}` : '1/1',
      }}
    >
      {background && (
        <ProgressiveImage
          className={styles.background}
          alt="Background"
          src={background.url}
          width={background.width}
          height={background.height}
        />
      )}
      <div className={classNames(styles.body, styleBlockMedium)}>
        <div>
          <h1>{title}</h1>
          <Text value={text} />
          {button && (
            <Link href={getSection(button.link).slug} className={styles.button}>
              {button.label}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

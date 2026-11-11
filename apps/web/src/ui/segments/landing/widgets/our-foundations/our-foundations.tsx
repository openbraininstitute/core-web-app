import React from 'react';

import Button from '@/ui/segments/landing/components/buttons/button';
import { Text } from '@/ui/segments/landing/components/text/text';
import Video from '@/ui/segments/landing/components/video/video';
import { styleBlockMedium } from '@/ui/segments/landing/styles';
import { classNames } from '@/util/utils';

import type {
  ContentForFoundationsLink,
  ContentForFoundationsText,
} from '@/services/sanity/api/get-foundations-content';

import styles from './our-foundations.module.css';

interface WidgetOurFoundationsProps {
  className?: string;
  text: ContentForFoundationsText;
  links: ContentForFoundationsLink[];
}

export function WidgetOurFoundations({ className, text, links }: WidgetOurFoundationsProps) {
  const { title, subtitle, description, videoURL } = text;

  return (
    <div className={classNames(className, styles.ourFoundations, styleBlockMedium)}>
      <div className={styles.section}>
        <div>
          {title && <h2>{title}</h2>}
          <div>
            {subtitle && <h3>{subtitle}</h3>}
            <Text raw value={description} />
          </div>
        </div>
      </div>
      <div className={styles.picture}>
        <Video src={videoURL} />
      </div>
      <footer>
        {links.map((link) => (
          <Button
            key={link.url}
            className={styles.link}
            subTitle={link.sublabel}
            title={link.label}
            onClick={link.url}
            target="_blank"
          />
        ))}
      </footer>
    </div>
  );
}

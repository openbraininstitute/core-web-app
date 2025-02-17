import React from 'react';

import { styleBlockMedium } from '../../styles';
import { classNames } from '@/util/utils';
import Button from '@/components/LandingPage/components/buttons/Button';
import {
  useSanityContentForOurFoundationsLinks,
  useSanityContentForOurFoundationsText,
} from '@/components/LandingPage/content';
import Video from '@/components/LandingPage/components/Video';
import { Text } from '@/components/LandingPage/components/Text';

import styles from './OurFoundations.module.css';

export interface WidgetOurFoundationsProps {
  className?: string;
}

export function WidgetOurFoundations({ className }: WidgetOurFoundationsProps) {
  const { title, subtitle, description, videoURL } = useSanityContentForOurFoundationsText();
  const links = useSanityContentForOurFoundationsLinks();

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

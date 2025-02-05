/* eslint-disable @next/next/no-img-element */
import React from 'react';

import LoginButton from '../buttons/LoginButton/LoginButton';
import { useSanityContentForHero } from '../content';
import { EnumSection } from '../sections/sections';
import NextPanel from './NextPanel';
import { classNames } from '@/util/utils';

import styles from './Hero.module.css';

export interface HeroProps {
  className?: string;
  section: EnumSection;
}

export default function Hero({ className, section }: HeroProps) {
  const { title, backgroundType, imageURL, videoURL, content, next } =
    useSanityContentForHero(section);

  return (
    <div className={classNames(className, styles.hero)}>
      <div className={classNames(styles.splash, styles.image)}>
        <div />
        <div>
          {backgroundType === 'video' && (
            <video loop muted autoPlay playsInline src={videoURL ?? ''} />
          )}
          {backgroundType === 'image' && <img src={imageURL ?? ''} alt="Background" />}
          <div className={styles.text}>
            <h1 className={styles.largeTitle}>{title}</h1>
            {content && <div className={styles.content}>{content}</div>}
          </div>
        </div>
      </div>
      <div className={styles.showOnlyForMobile}>
        <LoginButton />
      </div>
      <NextPanel>{next}</NextPanel>
    </div>
  );
}

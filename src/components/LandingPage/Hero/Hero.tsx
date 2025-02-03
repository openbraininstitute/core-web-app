/* eslint-disable @next/next/no-img-element */
import React from 'react';

import LoginButton from '../buttons/LoginButton/LoginButton';
import NextPanel from './NextPanel';
import { classNames } from '@/util/utils';

import styles from './Hero.module.css';

export interface HeroProps {
  className?: string;
  title: string;
  content?: React.ReactNode;
  backgroundType: 'video' | 'image';
  backgroundURL: string;
  next: string;
}

export default function Hero({
  className,
  title,
  content,
  backgroundType,
  backgroundURL,
  next,
}: HeroProps) {
  return (
    <div className={classNames(className, styles.hero)}>
      <div className={classNames(styles.splash, backgroundType === 'image' && styles.image)}>
        <div />
        <div>
          {backgroundType === 'video' && (
            <video loop muted autoPlay playsInline src={backgroundURL} />
          )}
          {backgroundType === 'image' && <img src={backgroundURL} alt="Background" />}
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

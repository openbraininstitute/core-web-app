'use client';

import React from 'react';

import LandingPage from '../../LandingPage';
import { useSanityContentForNewsItem } from '../../content';
import { EnumSection } from '../../sections/sections';
import FooterPanel from '../../layout/FooterPanel';
import { styleBlockSmall } from '../../styles';
import PaddedBlock from '../PaddedBlock';
import stylesLandingPage from '../../LandingPage.module.css';

import ProgressiveImage from '../ProgressiveImage';
import SanityContentRTF from '../SanityContentRTF';
import Menu from '../../layout/Menu';
import { classNames } from '@/util/utils';
import styles from './NewsPage.module.css';

export interface NewsPageProps {
  className?: string;
  slug: string;
}

export default function NewsPage({ className, slug }: NewsPageProps) {
  const news = useSanityContentForNewsItem(slug);

  if (!news) {
    return <LandingPage section={EnumSection.News} />;
  }

  return (
    <div className={classNames(className, stylesLandingPage.landingPage)}>
      <div className={styles.blueBackground}>
        <div />
      </div>
      <Menu scrollHasStarted section={EnumSection.News} />
      <PaddedBlock>
        <header className={classNames(styles.header, styleBlockSmall)}>
          <h2>NEWS</h2>
          <h1>{news.title}</h1>
          <div className={styles.notes}>
            <div>Published {formatDate(news.date)}</div>
            <div>© Copyright 2024, EPFL / BBP</div>
          </div>
        </header>
        <ProgressiveImage
          className={classNames(styles.image, styleBlockSmall)}
          forceAspectRatio
          src={news.imageURL}
          width={news.imageWidth}
          height={news.imageHeight}
        />
        <div className={styleBlockSmall}>
          {news.article && <SanityContentRTF value={news.article} />}
        </div>
      </PaddedBlock>
      <FooterPanel section={EnumSection.News} />
    </div>
  );
}

function formatDate(d: string) {
  const date = new Date(d);
  const fmt = new Intl.DateTimeFormat('en', { dateStyle: 'long' });
  return fmt.format(date);
}

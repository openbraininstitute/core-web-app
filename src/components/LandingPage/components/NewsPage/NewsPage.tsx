'use client';

import React from 'react';

import LandingPage from '../../LandingPage';
import { useSanityContentForNewsItem } from '../../content';
import { EnumSection } from '../../sections/sections';
import FooterPanel from '../../layout/FooterPanel';
import { styleBlockSmall } from '../../styles';
import PaddedBlock from '../PaddedBlock';
import Title from '../Title';
import { Text } from '../Text';
import stylesLandingPage from '../../LandingPage.module.css';
import { classNames } from '@/util/utils';

import styles from './NewsPage.module.css';

export interface NewsPageProps {
  className?: string;
  slug: string;
}

export default function NewsPage({ className, slug }: NewsPageProps) {
  const news = useSanityContentForNewsItem(slug);

  if (!news) return <LandingPage section={EnumSection.News} />;

  return (
    <div className={classNames(className, stylesLandingPage.landingPage)}>
      <PaddedBlock className={classNames(className, styles.newsPage)}>
        <Title value={news.title} />
        <div className={styleBlockSmall}>{news.article && <Text value={news.article} />}</div>
      </PaddedBlock>
      <FooterPanel />
    </div>
  );
}

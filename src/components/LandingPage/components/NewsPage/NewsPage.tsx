'use client';

import { PortableText } from 'next-sanity';
import LandingPage from '../../LandingPage';
import { useSanityContentForNewsItem } from '../../content';
import FooterPanel from '../../layout/FooterPanel';
import { EnumSection } from '../../sections/sections';

import Menu from '../../layout/Menu';
import HeaderNews from './HeaderNews';

import { classNames } from '@/util/utils';

import styles from '@/components/LandingPage/components/NewsPage/single-news-page.module.css';

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
    <div className={classNames(className, styles.pageContent)}>
      <Menu scrollHasStarted section={EnumSection.News} />
      <HeaderNews content={news} />
      <div className={styles.content}>
        <PortableText value={news.articleContent} />
      </div>
      <FooterPanel />
    </div>
  );
}

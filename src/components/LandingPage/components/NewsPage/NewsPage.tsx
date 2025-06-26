'use client';

import { PortableText } from 'next-sanity';

import LandingPage from '../../LandingPage';
import { useSanityContentForNewsItem } from '../../content';
import FooterPanel from '../../layout/FooterPanel';
import { EnumSection } from '../../sections/sections';

import Menu from '../../layout/Menu';
import HeaderNews from './HeaderNews';
import ImageFullScreen from './portable-text/image-full-screen';

import { classNames } from '@/util/utils';

import styles from '@/components/LandingPage/components/NewsPage/single-news-page.module.css';

export type NewsPageProps = {
  className?: string;
  slug: string;
};

export type FullScreenImageValue = {
  image: string;
  caption?: string;
  altText: string;
  [key: string]: any;
};

const portableTextComponents = {
  types: {
    fullScreenImage: ({ value }: { value: FullScreenImageValue }) => (
      <ImageFullScreen value={value} />
    ),
  },
};

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
        <PortableText value={news.articleContent} components={portableTextComponents} />
      </div>
      <FooterPanel />
    </div>
  );
}

'use client';

import { PortableText } from 'next-sanity';

import HeaderNews from '@/components/LandingPage/components/NewsPage/HeaderNews';

import { useSanityContentForNewsItem } from '@/components/LandingPage/content/news';
import FooterPanel from '@/components/LandingPage/layout/FooterPanel/FooterPanel';
import Menu from '@/components/LandingPage/layout/Menu/Menu';

import styles from './single-news-page.module.css';

export default function SingleNewsPage({ slug }: { slug: string }) {
  const news = useSanityContentForNewsItem(slug);

  if (!news) {
    return <div className="p-4 text-center">News item not found.</div>;
  }

  return (
    <div className="relative w-screen">
      <Menu scrollHasStarted />

      <HeaderNews content={news} />
      <div className={styles.content}>
        <PortableText value={news.articleContent} />
      </div>
      <FooterPanel />
    </div>
  );
}

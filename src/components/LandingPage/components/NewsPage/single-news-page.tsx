'use client';

import HeaderNews from '@/components/LandingPage/components/NewsPage/HeaderNews';

import { useSanityContentForNewsItem } from '@/components/LandingPage/content/news';
import Menu from '@/components/LandingPage/layout/Menu/Menu';

export default function SingleNewsPage({ slug }: { slug: string }) {
  const news = useSanityContentForNewsItem(slug);

  return (
    <div className="relative w-screen">
      <Menu scrollHasStarted />

      {news && <HeaderNews content={news} />}
    </div>
  );
}

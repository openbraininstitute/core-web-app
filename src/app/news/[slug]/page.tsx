import { ErrorBoundary } from 'react-error-boundary';

import SimpleErrorComponent from '@/components/GenericErrorFallback';
import { getNewsItem } from '@/services/sanity/api/get-news-item';
import LandingPage from '@/ui/segments/landing';
import NewsPageClient from '@/ui/segments/landing/components/news-page/news-page-client';
import FooterServer from '@/ui/segments/landing/layout/footer/footer-server';
import { EnumSection } from '@/ui/segments/landing/sections/sections';

export const dynamic = 'force-dynamic';

export default async function MainPage({
  params: promisedParams,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await promisedParams;
  const newsItem = await getNewsItem(slug);

  if (!newsItem) {
    return <LandingPage section={EnumSection.News} />;
  }

  return (
    <ErrorBoundary FallbackComponent={SimpleErrorComponent}>
      <NewsPageClient newsItem={newsItem} />
      <FooterServer />
    </ErrorBoundary>
  );
}

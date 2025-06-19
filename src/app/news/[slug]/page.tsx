import { ErrorBoundary } from 'react-error-boundary';

import SimpleErrorComponent from '@/components/GenericErrorFallback';
import NewsPage from '@/components/LandingPage/components/NewsPage';

export default async function MainPage({
  params: promisedParams,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await promisedParams;

  return (
    <ErrorBoundary FallbackComponent={SimpleErrorComponent}>
      <NewsPage slug={slug} />
    </ErrorBoundary>
  );
}

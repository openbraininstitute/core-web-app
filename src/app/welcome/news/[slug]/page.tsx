import { ErrorBoundary } from 'react-error-boundary';

import SimpleErrorComponent from '@/components/GenericErrorFallback';
import NewsPage from '@/components/LandingPage/components/NewsPage';

export default function MainPage({ params }: { params: { slug: string } }) {
  const { slug } = params;

  return (
    <ErrorBoundary FallbackComponent={SimpleErrorComponent}>
      <NewsPage slug={slug} />
    </ErrorBoundary>
  );
}

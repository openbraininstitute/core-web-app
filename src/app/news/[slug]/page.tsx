import { ErrorBoundary } from 'react-error-boundary';

import SimpleErrorComponent from '@/components/GenericErrorFallback';
import NewsPage from '@/components/LandingPage/components/NewsPage';

export default async function MainPage(props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  const { slug } = params;

  return (
    <ErrorBoundary FallbackComponent={SimpleErrorComponent}>
      <NewsPage slug={slug} />
    </ErrorBoundary>
  );
}

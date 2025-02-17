import { ErrorBoundary } from 'react-error-boundary';

import SimpleErrorComponent from '@/components/GenericErrorFallback';
import LandingPage from '@/components/LandingPage';
import { getSection } from '@/components/LandingPage/utils';

export default function MainPage({
  searchParams,
  params,
}: {
  searchParams: { errorcode: string } | undefined;
  params: { sectionName: string };
}) {
  const { sectionName } = params;

  return (
    <ErrorBoundary FallbackComponent={SimpleErrorComponent}>
      <LandingPage section={getSection(sectionName).index} errorCode={searchParams?.errorcode} />
    </ErrorBoundary>
  );
}

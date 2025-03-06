import { ErrorBoundary } from 'react-error-boundary';

import SimpleErrorComponent from '@/components/GenericErrorFallback';
import InviteLoader from '@/components/Invites';

export default function InvitePage({ searchParams }: { searchParams: { token?: string } }) {
  const { token } = searchParams;

  return (
    <ErrorBoundary FallbackComponent={SimpleErrorComponent}>
      <InviteLoader token={token} />
    </ErrorBoundary>
  );
}

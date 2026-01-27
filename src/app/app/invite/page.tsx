import { redirect } from 'next/navigation';
import { ErrorBoundary } from 'react-error-boundary';
import type { ApiErrorCause } from '@/api/error';
import { tryCatch } from '@/api/utils';
import { getInviteContent } from '@/api/virtual-lab-svc/queries/invite';
import { getSession } from '@/auth-fetch';
import { ErrorComponent as SimpleErrorComponent } from '@/components/GenericErrorFallback';
import type { ServerSideComponentProp } from '@/types/common';
import { InvitationProcessing } from '@/ui/segments/invites';
import { getErrorUrl } from '@/ui/segments/invites/helpers';

export default async function InvitePage({
  searchParams,
}: ServerSideComponentProp<null, { token: string | null }>) {
  const session = await getSession();
  const params = await searchParams;
  const { token } = params;
  if (!session?.accessToken || !token) {
    redirect(
      getErrorUrl({
        error: null,
        accessToken: session?.accessToken,
        inviteToken: token,
      })
    );
  }

  const { data, error } = await tryCatch(getInviteContent({ token }));

  if (error) {
    return redirect(
      getErrorUrl({
        error: error.cause as ApiErrorCause,
        accessToken: session?.accessToken,
        inviteToken: token,
      })
    );
  }

  return (
    <ErrorBoundary FallbackComponent={SimpleErrorComponent}>
      <InvitationProcessing data={data} />
    </ErrorBoundary>
  );
}

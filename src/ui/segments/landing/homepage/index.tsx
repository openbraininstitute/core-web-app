import { AntdRegistry } from '@ant-design/nextjs-registry';

import { auth } from '@/auth';
import { InvitationErrorDialog } from '@/ui/segments/invites/error-dialog';

import Homepage from './homepage';

import type { LandingPageError } from '../landing-page-shell';

export default async function HomePage({ error }: { error?: LandingPageError }) {
  const session = await auth();
  const isAuthenticated = Boolean(session?.user && !session.error);

  return (
    <AntdRegistry>
      <Homepage year={new Date().getFullYear()} isAuthenticated={isAuthenticated} />
      {error?.errorcode && <InvitationErrorDialog error={error} />}
    </AntdRegistry>
  );
}

import { AntdRegistry } from '@ant-design/nextjs-registry';

import { InvitationErrorDialog } from '@/ui/segments/invites/error-dialog';

import Homepage from './homepage';

import type { LandingPageError } from '../landing-page-shell';

export default function HomePage({ error }: { error?: LandingPageError }) {
  return (
    <AntdRegistry>
      <Homepage year={new Date().getFullYear()} />
      {error?.errorcode && <InvitationErrorDialog error={error} />}
    </AntdRegistry>
  );
}

'use server';

import { LoadingOutlined } from '@ant-design/icons';
import { Spin } from 'antd';
import { redirect as nextRedirect, RedirectType } from 'next/navigation';
import { Suspense } from 'react';
import { captureException } from '@sentry/nextjs';

import { processInvite } from './api';
import { getErrorUrl, getLabUrl, getProjectUrl } from './utils';
import { isVlmInviteResponse } from '@/types/virtual-lab/invites';
import { getSession } from '@/authFetch';

async function FullScreenLoader() {
  return (
    <div className="relative flex h-screen w-screen items-center justify-center bg-primary-8">
      <Spin indicator={<LoadingOutlined style={{ color: '#fff', fontSize: 24 }} spin />} />
    </div>
  );
}

function redirect(url: string) {
  return nextRedirect(url, RedirectType.replace) ?? null;
}

async function InviteHandler({ token: inviteToken }: { token?: string }) {
  const session = await getSession();

  if (!session?.accessToken) {
    const err = new Error('No user session / access token found');
    captureException(err, { extra: { invite: inviteToken } });

    return redirect(getErrorUrl(null, session?.accessToken, inviteToken));
  }

  if (!inviteToken) {
    return redirect(getErrorUrl(null, inviteToken));
  }

  if (!session.user.plan?.includes('pro')) {
    const planUpgradeSuccessRedirectUrl = `/app/invite?token=${inviteToken}`;
    // TODO: When the upgrade page is implemented, make sure the location and search params are correct.
    const planUpgradePageUrl = '/app/virtual-lab/subscription/upgrade';
    const params = new URLSearchParams({
      planUpgradeSuccessRedirectUrl,
      extraMsgCode: 'inviteRequiresUpgrade',
    });

    return redirect(`${planUpgradePageUrl}?${params}`);
  }

  try {
    const response = await processInvite(session.accessToken, inviteToken);

    if (!isVlmInviteResponse(response)) {
      return redirect(getErrorUrl(response, session?.accessToken, inviteToken));
    }

    switch (response.data.origin) {
      case 'Lab':
        return redirect(getLabUrl(response.data));
      case 'Project':
        return redirect(getProjectUrl(response.data));
      default:
        captureException(
          new Error(
            `User could not accept invite ${inviteToken} because unknown origin returned by server`
          ),
          { extra: response.data.origin }
        );
        return redirect(getErrorUrl(response, session?.accessToken, inviteToken));
    }
  } catch (error) {
    captureException(error, { extra: { invite: inviteToken } });
  }

  return redirect(getErrorUrl(null, session?.accessToken, inviteToken));
}

export default async function Invite({ token }: { token?: string }) {
  return (
    <>
      <FullScreenLoader />

      <Suspense>
        <InviteHandler token={token} />
      </Suspense>
    </>
  );
}

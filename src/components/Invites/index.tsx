'use client';

import { Spin } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';
import Image from 'next/image';
import Link from 'next/link';
import { useAtomValue } from 'jotai';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { captureException } from '@sentry/nextjs';

import { acceptInvite as sendInviteAcceptRequest, getInviteDetails } from './api';
import { getErrorUrl, getLabUrl, getProjectUrl } from './utils';
import Logo from '@/components/logo/as-svg';
import { InviteDetailsData } from '@/types/virtual-lab/invites';
import sessionAtom from '@/state/session';

import inviteBgImgSrc from '@/../public/images/invite/invite-bg.webp';
import { isVlmError } from '@/types/virtual-lab/common';

function getInviteDestinationLabel(inviteDetails: InviteDetailsData) {
  return inviteDetails.origin === 'Lab'
    ? `${inviteDetails.virtual_lab_name} Virtual Lab by ${inviteDetails.inviter_full_name}`
    : `${inviteDetails.project_name} Project by ${inviteDetails.inviter_full_name}`;
}

export default function InviteLoader() {
  const inviteToken = useSearchParams().get('token');
  const router = useRouter();

  const session = useAtomValue(sessionAtom);

  const [inviteDetails, setInviteDetails] = useState<InviteDetailsData | null>(null);
  const [processing, setProcessing] = useState<boolean>(false);

  const acceptInvite = async () => {
    if (!session?.accessToken || !inviteToken) {
      throw new Error('Missing session or invite token');
    }

    setProcessing(true);

    sendInviteAcceptRequest(session?.accessToken, inviteToken).then((response) => {
      if (isVlmError(response)) {
        router.push(getErrorUrl(response, session?.accessToken, inviteToken));
        return;
      }

      switch (response.data.origin) {
        case 'Lab':
          router.push(getLabUrl(response.data));
          return;
        case 'Project':
          router.push(getProjectUrl(response.data));
          return;
        default:
          captureException(
            new Error(
              `User could not accept invite ${inviteToken} because unknown origin returned by server`
            ),
            { extra: response.data.origin }
          );
          router.push(getErrorUrl(response, session?.accessToken, inviteToken));
      }
    });
  };

  useEffect(() => {
    if (!session?.accessToken || !inviteToken) {
      return router.push(getErrorUrl(null, session?.accessToken, inviteToken));
    }

    if (!session.user.plan?.includes('paid')) {
      const planUpgradeSuccessRedirectUrl = `/app/invite?token=${inviteToken}`;
      // TODO: When the upgrade page is implemented, make sure the location and search params are correct.
      const planUpgradePageUrl = '/app/virtual-lab/subscription/upgrade';
      const params = new URLSearchParams({
        planUpgradeSuccessRedirectUrl,
        extraMsgCode: 'inviteRequiresUpgrade',
      });

      return router.push(`${planUpgradePageUrl}?${params}`);
    }

    getInviteDetails(session?.accessToken, inviteToken).then((response) => {
      if (isVlmError(response)) {
        return router.push(getErrorUrl(response, session?.accessToken, inviteToken));
      }

      setInviteDetails(response.data);
    });
  }, []);

  return (
    <>
      <Image
        src={inviteBgImgSrc}
        alt="Invite background image"
        className="h-screen w-screen bg-primary-9 object-cover"
      />

      <Logo className="absolute left-10 top-10 text-white" />

      <div className="absolute left-0 top-0 h-screen w-screen content-center justify-items-center">
        {!inviteDetails ? (
          <Spin indicator={<LoadingOutlined style={{ color: '#fff', fontSize: 24 }} spin />} />
        ) : (
          <div className="relative">
            <div className="weight-bold bg-primary-8 p-8 text-center text-4xl text-white">
              Welcome to the Open Brain Platform
            </div>
            <div className="bg-white p-12 text-center">
              <p className="text-xl text-primary-9">
                You have been invited to join the {getInviteDestinationLabel(inviteDetails)}
              </p>

              <div className="mt-12 flex justify-center gap-8 text-lg">
                <Link
                  className="border-gray-4 border border-solid px-12 py-8"
                  href="/app/virtual-lab"
                >
                  Browse platform
                </Link>
                <button
                  onClick={acceptInvite}
                  className="bg-secondary-2 px-12 py-8 text-white disabled:text-gray-400"
                  type="button"
                  disabled={processing}
                >
                  Join {inviteDetails.origin === 'Lab' ? 'Virtual Lab' : 'Project'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

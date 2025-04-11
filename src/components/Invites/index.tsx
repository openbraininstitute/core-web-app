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
import { UserActiveSubscriptionResponse } from '@/api/virtual-lab-svc/queries/types';
import { getUserActiveSubscription } from '@/api/virtual-lab-svc/queries/subscription';

export default function InviteLoader() {
  const inviteToken = useSearchParams().get('token');
  const router = useRouter();

  const session = useAtomValue(sessionAtom);

  const [inviteDetails, setInviteDetails] = useState<InviteDetailsData | null>(null);
  const [subscription, setSubscription] = useState<UserActiveSubscriptionResponse | null>(null);
  const [processing, setProcessing] = useState<boolean>(false);

  const hasPaidPlan = subscription?.subscription.type === 'paid';

  const goToUpgrade = () => {
    const planUpgradeSuccessRedirectUrl = `/app/invite?token=${inviteToken}`;
    const planUpgradePageUrl = '/app/virtual-lab/account/subscription';
    const params = new URLSearchParams({ planUpgradeSuccessRedirectUrl });

    return router.push(`${planUpgradePageUrl}?${params}`);
  };

  const acceptInvite = async () => {
    if (!session?.accessToken || !inviteToken) {
      throw new Error('Missing session or invite token');
    }

    setProcessing(true);

    const res = await sendInviteAcceptRequest(session?.accessToken, inviteToken);

    if (isVlmError(res)) {
      router.push(getErrorUrl(res, session?.accessToken, inviteToken));
      return;
    }

    switch (res.data.origin) {
      case 'Lab':
        router.push(getLabUrl(res.data));
        return;
      case 'Project':
        router.push(getProjectUrl(res.data));
        return;
      default:
        captureException(
          new Error(
            `User could not accept invite ${inviteToken} because unknown origin returned by server`
          ),
          { extra: res.data.origin }
        );
        router.push(getErrorUrl(res, session?.accessToken, inviteToken));
    }
  };

  useEffect(() => {
    if (!session?.accessToken || !inviteToken) {
      return router.push(getErrorUrl(null, session?.accessToken, inviteToken));
    }

    const init = async () => {
      const currentSubscription = await getUserActiveSubscription();

      const inviteData = await getInviteDetails(session?.accessToken, inviteToken);
      if (isVlmError(inviteData)) {
        return router.push(getErrorUrl(inviteData, session?.accessToken, inviteToken));
      }

      setSubscription(currentSubscription);
      setInviteDetails(inviteData.data);
    };

    init();
  }, [inviteToken, router, session?.accessToken, session?.user.plan]);

  return (
    <>
      <Image
        src={inviteBgImgSrc}
        alt="Invite background image"
        className="bg-primary-9 h-screen w-screen object-cover"
      />

      <Logo className="absolute top-10 left-10 text-white" />

      <div className="absolute top-0 left-0 flex h-screen w-screen items-center justify-center">
        {!inviteDetails ? (
          <Spin indicator={<LoadingOutlined style={{ color: '#fff', fontSize: 24 }} spin />} />
        ) : (
          <div className="relative">
            <div className="weight-bold bg-primary-8 p-8 text-center text-4xl text-white">
              Welcome to the Open Brain Platform
            </div>
            <div className="bg-white p-12 text-center">
              <p className="text-primary-9 text-xl">
                {inviteDetails.inviter_full_name} has invited you to join the virtual lab, titled:{' '}
                {inviteDetails.virtual_lab_name}
              </p>

              {!hasPaidPlan && (
                <p className="text-primary-9 mt-4 text-xl">
                  Only users with a paid subscription can join other&apos;s Labs.
                </p>
              )}

              <div className="mt-12 flex justify-center gap-8 text-lg">
                <Link
                  className="border-gray-4 border border-solid px-12 py-8"
                  href="/app/virtual-lab"
                >
                  Browse platform
                </Link>

                {hasPaidPlan ? (
                  <button
                    onClick={acceptInvite}
                    className="bg-secondary-2 px-12 py-8 text-white disabled:text-gray-400"
                    type="button"
                    disabled={processing}
                  >
                    Join Virtual Lab
                  </button>
                ) : (
                  <button
                    onClick={goToUpgrade}
                    className="bg-primary-5 px-12 py-8 text-white disabled:text-gray-400"
                    type="button"
                  >
                    Upgrade subscription
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

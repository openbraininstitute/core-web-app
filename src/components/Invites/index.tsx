'use client';

import { Spin } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';
import Image from 'next/image';
import Link from 'next/link';
import { useAtomValue } from 'jotai';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { acceptInvite as sendInviteAcceptRequest, getInviteDetails } from './api';
import { getErrorUrl } from './utils';
import Logo from '@/components/logo/as-svg';
import { InviteDetailsData, InviteErrorCodes } from '@/types/virtual-lab/invites';
import sessionAtom from '@/state/session';

import inviteBgImgSrc from '@/../public/images/invite/invite-bg.webp';
import { isVlmError } from '@/types/virtual-lab/common';
import { listProjects } from '@/api/virtual-lab-svc/queries/project';
import { ROOT_ROUTE } from '@/config';
import { tryCatch } from '@/api/utils';

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
    const res = await sendInviteAcceptRequest(session?.accessToken, inviteToken);
    if (isVlmError(res)) {
      router.push(getErrorUrl(res, session?.accessToken, inviteToken));
      return;
    }
    if (res.data.status === 'already_accepted') {
      return `/?errorcode=${InviteErrorCodes.INVITE_ALREADY_ACCEPTED}&origin=${origin}&lab_id=${res.data.virtual_lab_id}`;
    }

    const { data: results, error } = await tryCatch(
      listProjects({ virtualLabId: res.data.virtual_lab_id, page: 1, size: 1 })
    );

    if (error) {
      router.push(`${ROOT_ROUTE}/sync`);
    }

    if (res.data.origin) {
      const projectId = results?.data?.results.at(0)?.id;
      if (projectId) {
        router.push(`${ROOT_ROUTE}/${res.data.virtual_lab_id}/${projectId}`);
      } else {
        router.push(`${ROOT_ROUTE}/sync`);
      }
    }
  };

  useEffect(() => {
    if (!session?.accessToken || !inviteToken) {
      return router.push(getErrorUrl(null, session?.accessToken, inviteToken));
    }

    const init = async () => {
      const inviteData = await getInviteDetails(session?.accessToken, inviteToken);
      if (isVlmError(inviteData)) {
        return router.push(getErrorUrl(inviteData, session?.accessToken, inviteToken));
      }

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

              <div className="mt-12 flex justify-center gap-8 text-lg">
                <Link
                  className="border-gray-4 border border-solid px-12 py-8"
                  href="/app/virtual-lab/sync"
                >
                  Browse platform
                </Link>

                <button
                  onClick={acceptInvite}
                  className="bg-secondary-2 px-12 py-8 text-white disabled:text-gray-400"
                  type="button"
                  disabled={processing}
                >
                  Join Virtual Lab
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

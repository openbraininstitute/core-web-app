'use client';

import { useEffect, useState } from 'react';
import { Button, Modal } from 'antd';
import { CloseOutlined } from '@ant-design/icons';
import { useSearchParams, useRouter } from 'next/navigation';

import { InviteErrorCodes } from '@/types/virtual-lab/invites';
import { generateLabUrl, generateVlProjectUrl } from '@/util/virtual-lab/urls';

const getInviteErrorMessage = (code?: string): { title: string; message: string } => {
  try {
    const errorCode = Number(code);
    switch (errorCode) {
      case InviteErrorCodes.UNAUTHORIZED:
        return {
          title: 'Unauthorized access',
          message:
            'You need to be signed in to accept this invitation. Please log in and try again.',
        };
      case InviteErrorCodes.DATA_CONFLICT:
        return {
          title: 'Data conflict error',
          message:
            'The invitation details do not match your account information. Please check with the sender or try again with the correct account.',
        };
      case InviteErrorCodes.TOKEN_EXPIRED:
        return {
          title: 'Invitation expired',
          message: 'This invitation link has expired. Please request a new invite from the sender.',
        };
      case InviteErrorCodes.INVALID_LINK:
        return {
          title: 'Invalid invitation link',
          message:
            'The invitation link provided is invalid. Ensure you are using the correct link or request a new one.',
        };
      case InviteErrorCodes.INVITE_ALREADY_ACCEPTED:
        return {
          title: 'Invitation already accepted',
          message:
            'This invitation has already been accepted. You can proceed to sign in and access your environment.',
        };
      case InviteErrorCodes.UNKNOWN:
      default:
        return {
          title: 'Unexpected error',
          message:
            'We were unable to process your invitation due to an unexpected error. Please confirm that you are logged in and try again or contact support for assistance.',
        };
    }
  } catch {
    return {
      title: 'Invitation Processing Error',
      message:
        'An error occurred while processing your invitation. Please check the link or contact support for help.',
    };
  }
};

export default function AcceptInviteErrorDialog({ errorCode }: { errorCode: string }) {
  // This is needed to prevent hydration errors.
  // The Dialog is not rendered correctly on server side, so we need to prevent it from rendering until the client side hydration is complete (and `useEffect` is run).
  // https://github.com/vercel/next.js/discussions/35773
  const [open, setOpen] = useState(false);
  const isInviteAcceptedError = errorCode === `${InviteErrorCodes.INVITE_ALREADY_ACCEPTED}`;
  useEffect(() => {
    setOpen(true);
  }, []);

  const { title, message } = getInviteErrorMessage(errorCode);
  const onClose = () => setOpen(false);

  return (
    <Modal centered open={open} closeIcon={null} footer={null}>
      <div className="flex flex-col">
        <div className="flex items-center justify-between border-b border-gray-200 pb-3">
          <h2 className="text-2xl font-bold text-primary-8">{title}</h2>
          <button
            type="button"
            aria-label="close"
            onClick={onClose}
            className="p-2  hover:bg-gray-100"
          >
            <CloseOutlined className="h-5 w-5 text-gray-500" />
          </button>
        </div>
        <p className="mt-4 text-lg text-gray-700">{message}</p>
        <div className="ml-auto mt-5 justify-end">
          {isInviteAcceptedError && <InviteRedirectButton />}
        </div>
      </div>
    </Modal>
  );
}

function InviteRedirectButton() {
  const searchParams = useSearchParams();
  const origin = searchParams.get('origin');
  const labId = searchParams.get('lab_id');
  const projectId = searchParams.get('project_id');
  const { push } = useRouter();

  if (origin === 'Lab' && !!labId) {
    return (
      <Button
        htmlType="button"
        type="primary"
        size="large"
        onClick={() => push(`${generateLabUrl(labId)}/overview`)}
        className="rounded-none bg-primary-8 text-white"
      >
        Go to virtual lab
      </Button>
    );
  }

  if (origin === 'Project' && !!labId && !!projectId) {
    return (
      <Button
        htmlType="button"
        type="primary"
        size="large"
        onClick={() => push(`${generateVlProjectUrl(labId, projectId)}/home`)}
        className="rounded-none bg-primary-8 text-white"
      >
        Go to project
      </Button>
    );
  }

  return null;
}

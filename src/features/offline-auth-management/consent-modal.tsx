'use client';

import { Modal } from 'antd';

export function OfflineTokenConsentModal({
  open,
  consentUrl,
  onCancel,
  onOpenConsent,
}: {
  open: boolean;
  consentUrl?: string;
  onCancel: () => void;
  onOpenConsent: () => void;
}) {
  return (
    <Modal
      title="Offline access consent required"
      open={open}
      onCancel={onCancel}
      okText={consentUrl ? 'Open consent page' : 'Preparing…'}
      onOk={onOpenConsent}
      okButtonProps={{ disabled: !consentUrl, className: 'bg-primary-9 rounded-full' }}
      cancelButtonProps={{ className: 'rounded-full' }}
      cancelText="Cancel"
    >
      <p className="text-lg">
        To run this operation, you need to grant an offline access token. A new tab should open
        automatically. If it didn’t, use the button below or click the link.
      </p>
    </Modal>
  );
}

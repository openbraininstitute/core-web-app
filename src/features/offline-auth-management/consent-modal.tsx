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
      okButtonProps={{ disabled: !consentUrl }}
      cancelText="Cancel"
    >
      <p className="text-lg">
        To run this extraction, you need to grant offline access. A new tab should open
        automatically. If it didn’t, use the button below or click the link.
      </p>

      {!!consentUrl && (
        <a
          className="text-primary-9 mt-4 inline-block text-lg font-semibold"
          href={consentUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          Open consent page
        </a>
      )}
    </Modal>
  );
}

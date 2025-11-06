'use client';

import FeedbackForm from './index';

import { Modal } from '@/ui/molecules/modal';

type FeedbackModalProps = {
  open: boolean;
  onClose: () => void;
};

export default function FeedbackModal({ open, onClose }: FeedbackModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title=""
      size="md"
      position="custom"
      animation="scale"
      closable={false}
      headerClassName="!hidden"
      className="!fixed !top-1/2 !left-1/2 !-translate-x-1/2 !-translate-y-1/2"
    >
      <FeedbackForm onClose={onClose} />
    </Modal>
  );
}

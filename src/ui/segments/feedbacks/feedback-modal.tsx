'use client';

import dynamic from 'next/dynamic';

import { Modal } from '@/ui/molecules/modal';

// Dynamically import FeedbackForm with SSR disabled to avoid Suspense boundary issues
const FeedbackForm = dynamic(() => import('./index'), {
  ssr: false,
  loading: () => (
    <div className="flex flex-col p-6">
      <div className="border-neutral-2 mb-6 flex items-start justify-between border-b pb-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-primary-9 text-2xl font-bold">Submit Feedback</h2>
          <p className="text-neutral-5 text-base">
            Help us improve by sharing your thoughts, reporting bugs, or suggesting new features.
          </p>
        </div>
      </div>
      <div className="flex items-center justify-center py-8">
        <div className="text-neutral-4 text-sm">Loading...</div>
      </div>
    </div>
  ),
});

type FeedbackModalProps = {
  open: boolean;
  onClose: () => void;
};

export default function FeedbackModal({ open, onClose }: FeedbackModalProps) {
  // Component is already dynamically imported with ssr: false, so no need for mounted check
  if (!open) {
    return null;
  }

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

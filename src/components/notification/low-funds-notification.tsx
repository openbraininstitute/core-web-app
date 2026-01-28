'use client';

import { RiCloseFill, RiMoneyDollarCircleLine } from '@remixicon/react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import { listVirtualLabMembers } from '@/api/virtual-lab-svc/queries/member';
import { useUserRole } from '@/hooks/use-user-role';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { CreditsTransferModal } from '@/ui/segments/project/credits/credits-transfer-modal';
import { cn } from '@/utils/css-class';

type Props = {
  title: string;
  description: string;
  onClose?: () => void;
  duration?: number;
};

export function LowFundsNotification({ title, description, onClose, duration = 10000 }: Props) {
  const [isVisible, setIsVisible] = useState(true);
  const [showCreditsModal, setShowCreditsModal] = useState(false);
  const { virtualLabId } = useWorkspace();
  const { isVirtualLabAdmin } = useUserRole({ virtualLabId });

  const { data: membersData } = useQuery({
    queryKey: ['virtual-lab-members', virtualLabId],
    queryFn: () => listVirtualLabMembers({ virtualLabId: virtualLabId ?? '' }),
    enabled: !!virtualLabId && !isVirtualLabAdmin,
  });

  const adminEmail = membersData?.data?.users.find((user) => user.role === 'admin')?.email;

  const handleClose = useCallback(() => {
    setIsVisible(false);
    setTimeout(() => {
      onClose?.();
    }, 300);
  }, [onClose]);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        handleClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration, handleClose]);

  const handleBuyCredits = () => {
    setShowCreditsModal(true);
  };

  const handleCloseModal = () => {
    setShowCreditsModal(false);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <>
      <div
        className={cn(
          'border-neutral-2 fixed top-4 right-4 z-99999 max-w-[448px] min-w-[384px] rounded-2xl border bg-white shadow-lg transition-all duration-300',
          isVisible ? 'translate-y-0 opacity-100' : 'pointer-events-none -translate-y-2 opacity-0'
        )}
        role="alert"
      >
        <div className="flex gap-4 p-6">
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex justify-between">
              <div className="flex flex-row gap-x-2">
                <div className="shrink-0 pt-0.5">
                  <RiMoneyDollarCircleLine className="text-warning text-2xl" size={24} />
                </div>
                <h4 className="text-primary-9 m-0 text-lg font-semibold">{title}</h4>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="text-neutral-4 hover:text-primary-9 -mt-1 -mr-1 shrink-0 p-1 transition-colors"
                aria-label="Close notification"
                name="close-notification-button"
              >
                <RiCloseFill className="text-xl" />
              </button>
            </div>
            <p className="text-neutral-4 mb-4 text-base leading-normal">{description}</p>
            {isVirtualLabAdmin ? (
              <button
                type="button"
                name="transfer-credits-button"
                id="transfer-credits-button"
                onClick={handleBuyCredits}
                className="text-primary-9 border-neutral-3 rounded-4xl border px-6 py-2 text-lg font-bold"
              >
                Transfer credits
              </button>
            ) : (
              adminEmail && (
                <Link
                  href={`mailto:${adminEmail}?subject=Low%20funds%20notification`}
                  target="_blank"
                  className="text-primary-9 border-neutral-3 rounded-4xl border px-6 py-2 text-lg font-bold"
                >
                  Contact admin
                </Link>
              )
            )}
          </div>
        </div>
      </div>
      <CreditsTransferModal open={showCreditsModal} onClose={handleCloseModal} />
    </>
  );
}

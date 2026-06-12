'use client';

import { useQuery } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';

import { listVirtualLabMembers } from '@/api/virtual-lab-svc/queries/member';
import { useAppNotification } from '@/components/notification';
import { useWorkspaceMembership } from '@/hooks/use-user-membership';
import { getProjectAccountBalance } from '@/services/virtual-lab/projects';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { CreditsTransferModal } from '@/ui/segments/project/credits/credits-transfer-modal';
import { keyBuilder } from '@/ui/use-query-keys/workspace';

import { isLowCreditsError } from './error-detection';
import {
  buildLowCreditsMessages,
  LOW_CREDITS_EMAIL_SUBJECT,
  type LowCreditsMessages,
} from './messages';

import type { ReactNode } from 'react';
import type { WorkspaceContext } from '@/types/common';

const NOTIFICATION_KEY = 'low-credits';

export type UseLowCreditsOptions = {
  /** defaults to the workspace from the current route */
  context?: WorkspaceContext;
  /**
   * the thing the user was trying to do, e.g. `'run the notebook'` or
   * `'build the model'`. It is slotted into the shared message template so the
   * notification reads identically across activities, only the subject changes.
   */
  subject?: string;
  /** escape hatch to override individual messages (title, labels, etc.) */
  messages?: Partial<LowCreditsMessages>;
  /**
   * poll the project balance so {@link UseLowCreditsResult.hasNoCredits} and
   * {@link UseLowCreditsResult.guard} can block a run *before* hitting the
   * backend. off by default to avoid an extra request on every button
   */
  watchBalance?: boolean;
};

export type UseLowCreditsResult = {
  /** whether the user can buy/transfer credits (virtual lab admins). */
  isAdmin: boolean;
  /** true once the polled balance is known to be empty (`watchBalance` only) */
  hasNoCredits: boolean;
  /** open the buy/transfer credits modal directly */
  openCreditsModal: () => void;
  /** show the standard low-credits notification with its call to action */
  notifyLowCredits: (messages?: Partial<LowCreditsMessages>) => void;
  /**
   * if `error` is a low-credits error, show the notification and return `true`.
   * otherwise return `false` so the caller can render its own error.
   */
  reportError: (error: unknown, messages?: Partial<LowCreditsMessages>) => boolean;
  /**
   * preemptive check (requires `watchBalance`). returns `true` and notifies when the project has no credits, so callers can `if (guard()) return;`.
   * the project has no credits, so callers can `if (guard()) return;`
   */
  guard: (messages?: Partial<LowCreditsMessages>) => boolean;
  /** render this once in the tree to mount the buy/transfer modal */
  creditsModal: ReactNode;
};

export function useLowCredits(options: UseLowCreditsOptions = {}): UseLowCreditsResult {
  const workspace = useWorkspace();
  const context = options.context ?? workspace;
  const { virtualLabId, projectId } = context;

  const notification = useAppNotification();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { isVirtualLabAdmin } = useWorkspaceMembership({ virtualLabId });

  // only non-admins need the admin's email for the "contact administrator" link
  const { data: membersData } = useQuery({
    queryKey: keyBuilder.listVirtualLabTeam({ virtualLabId }),
    queryFn: () => listVirtualLabMembers({ virtualLabId }),
    enabled: !!virtualLabId && !isVirtualLabAdmin,
  });
  const adminEmail = membersData?.data?.users.find((user) => user.role === 'admin')?.email;

  const { data: balanceData } = useQuery({
    queryKey: keyBuilder.wallet({ virtualLabId, projectId }),
    queryFn: () => getProjectAccountBalance({ virtualLabId, projectId }),
    enabled: !!options.watchBalance && !!virtualLabId && !!projectId,
  });
  const balance = balanceData?.balance != null ? Number(balanceData.balance) : null;
  const hasNoCredits = balance !== null && balance <= 0;

  const openCreditsModal = useCallback(() => setIsModalOpen(true), []);

  const notifyLowCredits = useCallback(
    (overrides?: Partial<LowCreditsMessages>) => {
      const copy = {
        ...buildLowCreditsMessages(options.subject),
        ...options.messages,
        ...overrides,
      };
      const contactHref = adminEmail
        ? `mailto:${adminEmail}?subject=${encodeURIComponent(LOW_CREDITS_EMAIL_SUBJECT)}`
        : undefined;

      notification.error({
        key: NOTIFICATION_KEY,
        message: copy.title,
        description: (
          <div className="flex flex-col items-start gap-2">
            <p>{isVirtualLabAdmin ? copy.adminDescription : copy.nonAdminDescription}</p>
            {isVirtualLabAdmin ? (
              <button
                type="button"
                name="low-credits-action-button"
                onClick={() => {
                  notification.destroy(NOTIFICATION_KEY);
                  openCreditsModal();
                }}
                className="text-primary-8 border-neutral-300 inline-flex w-fit rounded-full border px-4 py-1.5 hover:underline"
              >
                {copy.actionLabel}
              </button>
            ) : (
              contactHref && (
                <a
                  href={contactHref}
                  className="text-primary-8 border-neutral-300 inline-flex w-fit rounded-full border px-4 py-1.5 no-underline hover:underline"
                >
                  {copy.contactAdminLabel}
                </a>
              )
            )}
          </div>
        ),
        placement: 'topRight',
        duration: 5,
      });
    },
    [
      adminEmail,
      isVirtualLabAdmin,
      notification,
      openCreditsModal,
      options.messages,
      options.subject,
    ]
  );

  const reportError = useCallback(
    (error: unknown, overrides?: Partial<LowCreditsMessages>) => {
      if (!isLowCreditsError(error)) return false;
      notifyLowCredits(overrides);
      return true;
    },
    [notifyLowCredits]
  );

  const guard = useCallback(
    (overrides?: Partial<LowCreditsMessages>) => {
      if (!hasNoCredits) return false;
      notifyLowCredits(overrides);
      return true;
    },
    [hasNoCredits, notifyLowCredits]
  );

  const creditsModal = useMemo(
    () => <CreditsTransferModal open={isModalOpen} onClose={() => setIsModalOpen(false)} />,
    [isModalOpen]
  );

  return {
    isAdmin: isVirtualLabAdmin,
    hasNoCredits,
    openCreditsModal,
    notifyLowCredits,
    reportError,
    guard,
    creditsModal,
  };
}

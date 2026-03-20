'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { listVirtualLabMembers } from '@/api/virtual-lab-svc/queries/member';
import { useWorkspaceMembership } from '@/hooks/use-user-membership';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { CreditsTransferModal } from '@/ui/segments/project/credits/credits-transfer-modal';
import { keyBuilder } from '@/ui/use-query-keys/workspace';

/**
 * Resolves admin status and admin email for the current workspace,
 * and provides a CreditsTransferModal ready to render.
 *
 * Usage:
 *   const { cardProps, CreditsModal } = useInsufficientCredits();
 *   // Pass cardProps to <InsufficientCreditsCard message="..." {...cardProps} />
 *   // Render {CreditsModal} somewhere in your component tree
 */
export function useInsufficientCredits() {
  const [showCreditsModal, setShowCreditsModal] = useState(false);
  const { virtualLabId } = useWorkspace();
  const { isVirtualLabAdmin } = useWorkspaceMembership({ virtualLabId });

  const { data: membersData } = useQuery({
    queryKey: keyBuilder.listVirtualLabTeam({ virtualLabId }),
    queryFn: () => listVirtualLabMembers({ virtualLabId }),
    enabled: !!virtualLabId && !isVirtualLabAdmin,
  });

  const adminEmail = membersData?.data?.users.find((user) => user.role === 'admin')?.email;

  const cardProps = {
    isAdmin: isVirtualLabAdmin,
    adminEmail,
    onAddCredits: () => setShowCreditsModal(true),
  };

  const creditsModal = (
    <CreditsTransferModal open={showCreditsModal} onClose={() => setShowCreditsModal(false)} />
  );

  return { cardProps, isVirtualLabAdmin, adminEmail, creditsModal };
}

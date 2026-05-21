'use client';

import { useQuery } from '@tanstack/react-query';

import { getVirtualLab } from '@/api/virtual-lab-svc/queries/virtual-lab';
import { EmailVerification } from '@/features/email-verification';
import { StandaloneStripePayment } from '@/features/payments/standalone/stripe-payment';
import { useUserPermissions } from '@/hooks/use-user-permissions';
import { keyBuilder } from '@/ui/use-query-keys/workspace';

export function StripePaymentFlow({
  virtualLabId,
  onModeChange,
}: {
  virtualLabId: string;
  onModeChange: (mode: 'selection') => void;
}) {
  const { data: virtualLabData, isLoading } = useQuery({
    queryKey: keyBuilder.getOneLab({ virtualLabId }),
    queryFn: () => getVirtualLab(virtualLabId),
    enabled: Boolean(virtualLabId),
  });
  const { isVirtualLabAdmin } = useUserPermissions({ virtualLabId, projectId: undefined });

  if (!isLoading && !virtualLabData?.data?.virtual_lab.email_verified && isVirtualLabAdmin) {
    return <EmailVerification virtualLabId={virtualLabId} />;
  }

  return (
    <StandaloneStripePayment
      virtualLabId={virtualLabId}
      onCancel={() => onModeChange('selection')}
    />
  );
}

'use client';

import { ArrowLeftOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';

import { getVirtualLab } from '@/api/virtual-lab-svc/queries/virtual-lab';
import { EmailVerification } from '@/features/email-verification';
import { StandaloneStripePayment } from '@/features/payments/standalone/stripe-payment';
import { useUserPermissions } from '@/hooks/use-user-permissions';
import { GhostRoundedIconButton } from '@/ui/segments/workspaces/space-manager/sections/elements';
import { keyBuilder } from '@/ui/use-query-keys/workspace';
import { cn } from '@/utils/css-class';

export function StripePaymentFlow({
  virtualLabId,
  onModeChange,
  classnames,
}: {
  virtualLabId: string;
  onModeChange: (mode: 'selection') => void;
  classnames?: {
    root?: string;
    content?: string;
    emailVerification?: {
      codeForm?: string;
      requestForm?: string;
    };
  };
}) {
  const { data: virtualLabData, isLoading } = useQuery({
    queryKey: keyBuilder.getOneLab({ virtualLabId }),
    queryFn: () => getVirtualLab({ id: virtualLabId }),
    enabled: Boolean(virtualLabId),
  });
  const { isVirtualLabAdmin } = useUserPermissions({ virtualLabId, projectId: undefined });

  if (!isLoading && !virtualLabData?.email_verified && isVirtualLabAdmin) {
    return (
      <EmailVerification
        virtualLabId={virtualLabId}
        classnames={{
          codeForm: classnames?.emailVerification?.codeForm,
          requestForm: classnames?.emailVerification?.requestForm,
        }}
      />
    );
  }

  return (
    <section
      id="stripe-payment-flow"
      data-testid="stripe-payment-flow"
      className={cn(
        'flex h-full min-h-0 w-full flex-1 flex-col gap-3.5 rounded-2xl bg-white pt-0',
        classnames?.root
      )}
    >
      <div className="shrink-0 pt-5 back-button-wrapper">
        <GhostRoundedIconButton
          icon={<ArrowLeftOutlined />}
          label="Select option"
          classNames={{ label: 'font-semibold', root: 'hover:bg-gray-100' }}
          onClick={() => onModeChange('selection')}
          iconPosition="start"
        />
      </div>
      <div className="min-h-0 flex-1 mb-4 overflow-x-hidden overflow-y-auto secondary-scrollbar [scrollbar-gutter:stable]">
        <div
          id="standalone-stripe-payment-content"
          className="mr-1 flex flex-col rounded-2xl border border-gray-100 px-4 pt-4"
        >
          <StandaloneStripePayment
            virtualLabId={virtualLabId}
            onCancel={() => onModeChange('selection')}
          />
        </div>
      </div>
    </section>
  );
}

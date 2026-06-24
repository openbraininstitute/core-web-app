'use client';

import { CloseOutlined } from '@ant-design/icons';
import { RiArrowLeftLongLine, RiArrowLeftRightLine, RiShoppingCart2Line } from '@remixicon/react';
import { useQuery } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { match } from 'ts-pattern';

import { getProject } from '@/api/virtual-lab-svc/queries/project';
import { StripePaymentFlow } from '@/features/payments/standalone';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { Button } from '@/ui/molecules/button';
import { Modal } from '@/ui/molecules/modal';
import {
  type ManageCreditsStepHandle,
  TransferCredits,
} from '@/ui/segments/virtual-lab-settings/elements/manage-credits';
import {
  PaymentModeSelection,
  PurchaseModeDictionary,
  type TPurchaseModeDictionary,
} from '@/ui/segments/virtual-lab-settings/elements/payment-mode-selection';
import { PromotionCode } from '@/ui/segments/virtual-lab-settings/elements/promotion-code-form';
import { keyBuilder } from '@/ui/use-query-keys/workspace';
import { cn } from '@/utils/css-class';

export const CreditsAction = {
  Transfer: {
    key: 'transfer',
    label: 'Transfer credits between your virtual lab and projects.',
  },
  Buy: {
    key: 'buy',
    label: 'Buy credits for your virtual lab and projects.',
  },
  Selection: {
    key: 'selection',
    label: 'Buy or transfer credits for your virtual lab and projects.',
  },
} as const;

export type TCreditsAction = (typeof CreditsAction)[keyof typeof CreditsAction]['key'];
export type TCreditsFlowAction = Exclude<TCreditsAction, typeof CreditsAction.Selection.key>;

const CREDITS_ACTION_LABEL: Record<TCreditsAction, string> = {
  transfer: CreditsAction.Transfer.label,
  buy: CreditsAction.Buy.label,
  selection: CreditsAction.Selection.label,
};

type Props = {
  open: boolean;
  onClose: () => void;
  /**
   * which action the modal performs. use `'selection'` to let the user choose
   * between buy and transfer (e.g. low-credits flow). default to `'transfer'`.
   */
  action?: TCreditsAction;
};

type CreditsActionOptionConfig = {
  action: TCreditsFlowAction;
  icon: React.ReactNode;
  title: string;
  description: string;
};

const CreditsActionOptions: CreditsActionOptionConfig[] = [
  {
    action: CreditsAction.Buy.key,
    icon: <RiShoppingCart2Line className="size-8 text-primary-9" />,
    title: 'Buy credits',
    description: 'Purchase credits with your card and start using them immediately',
  },
  {
    action: CreditsAction.Transfer.key,
    icon: <RiArrowLeftRightLine className="size-8 text-primary-9" />,
    title: 'Transfer credits',
    description: 'Move credits between your virtual lab and projects',
  },
];

function CreditsActionSelection({ onSelect }: { onSelect: (action: TCreditsFlowAction) => void }) {
  return (
    <div
      id="credits-action-selection"
      data-testid="credits-action-selection"
      className="w-full px-8 select-none"
    >
      <div className="mx-auto grid w-full max-w-lg gap-4 md:grid-cols-2">
        {CreditsActionOptions.map(({ action, icon, title, description }) => (
          <button
            key={action}
            type="button"
            onClick={() => onSelect(action)}
            className={cn(
              'group flex w-full flex-col items-center rounded-2xl border border-gray-100 bg-white p-8 text-center',
              'transition-colors duration-200 hover:border-gray-200 hover:bg-gray-50'
            )}
          >
            <div className="mb-4 inline-flex rounded-xl border border-gray-100 bg-gray-50 p-3 transition-colors group-hover:border-gray-200 group-hover:bg-gray-100">
              {icon}
            </div>
            <h2 className="mb-2 text-lg font-semibold text-primary-9">{title}</h2>
            <p className="text-sm leading-relaxed text-gray-500">{description}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

function BuyCreditsTab({
  virtualLabId,
  onClose,
  mode,
  onModeChange,
  classnames,
}: {
  virtualLabId: string;
  onClose: () => void;
  mode: TPurchaseModeDictionary;
  onModeChange: (mode: TPurchaseModeDictionary) => void;
  classnames?: {
    mode?: {
      root?: string;
    };
    flow?: {
      root?: string;
      content?: string;
      emailVerification?: {
        codeForm?: string;
        requestForm?: string;
      };
    };
    promotion?: {
      root?: string;
      content?: string;
    };
  };
}) {
  const handleModeChange = (newMode: TPurchaseModeDictionary) => {
    // When user goes back to selection (either from cancel or after successful payment), close the modal
    if (newMode === PurchaseModeDictionary.Selection) {
      onClose();
    } else {
      onModeChange(newMode);
    }
  };

  // Override handleModeChange to prevent closing when going back via back button
  // Only close when coming from StripePaymentFlow or PromotionCode components
  const handleModeChangeFromComponents = (newMode: TPurchaseModeDictionary) => {
    // When user goes back to selection from components (cancel or success), close the modal
    if (newMode === PurchaseModeDictionary.Selection) {
      onClose();
    } else {
      onModeChange(newMode);
    }
  };

  const content = match({ mode })
    .with({ mode: PurchaseModeDictionary.Selection }, () => (
      <PaymentModeSelection
        virtualLabId={virtualLabId}
        onModeChange={handleModeChange}
        classnames={classnames?.mode}
      />
    ))
    .with({ mode: PurchaseModeDictionary.Buy }, () => (
      <StripePaymentFlow
        virtualLabId={virtualLabId}
        onModeChange={handleModeChangeFromComponents}
        classnames={classnames?.flow}
      />
    ))
    .with({ mode: PurchaseModeDictionary.Promo }, () => (
      <PromotionCode
        virtualLabId={virtualLabId}
        onModeChange={handleModeChangeFromComponents}
        classnames={classnames?.promotion}
      />
    ))
    .otherwise(() => null);

  return (
    <div className="flex h-full w-full flex-col" data-widget="buy-credits-form">
      <div className="w-full h-full" data-widget={mode}>
        {content}
      </div>
    </div>
  );
}

export function CreditsTransferModal({
  open,
  onClose,
  action = CreditsAction.Transfer.key,
}: Props) {
  const creditsRef = useRef<ManageCreditsStepHandle>(null);
  const [buyMode, setBuyMode] = useState<TPurchaseModeDictionary>(PurchaseModeDictionary.Selection);
  const [selectedAction, setSelectedAction] = useState<TCreditsFlowAction | null>(null);

  const { virtualLabId, projectId } = useWorkspace();
  const { data: project } = useQuery({
    queryKey: keyBuilder.getWorkspace({ virtualLabId, projectId }),
    queryFn: () => getProject({ virtualLabId, projectId }),
  });

  const isSelectionMode = action === CreditsAction.Selection.key;
  const activeAction = isSelectionMode ? selectedAction : action;

  const resetBuyMode = () => setBuyMode(PurchaseModeDictionary.Selection);

  const onCloseModal = () => {
    resetBuyMode();
    setSelectedAction(null);
    onClose();
  };

  const handleBack = () => {
    if (isSelectionMode) {
      resetBuyMode();
      setSelectedAction(null);
      return;
    }

    onCloseModal();
  };

  const titleAction = activeAction ?? CreditsAction.Selection.key;

  return (
    <Modal
      maskClosable
      id="model-credits-manager"
      closable={false}
      open={open}
      title={
        <div className="flex w-full items-center justify-between gap-4 select-none">
          <div className="flex items-center justify-center gap-2">
            {isSelectionMode && activeAction !== null && (
              <Button
                rounded
                size="md"
                variant="icon"
                onClick={handleBack}
                className="text-primary-9 border-gray-100 mt-2.5 bg-white hover:bg-gray-100"
              >
                <RiArrowLeftLongLine className="size-4" />
              </Button>
            )}
            <div className="flex flex-col items-start justify-between">
              <h2 className="text-2xl font-semibold text-primary-9">{project?.name}</h2>
              <p className="text-primary-9 text-sm font-light">
                {CREDITS_ACTION_LABEL[titleAction]}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              rounded
              size="md"
              variant="icon"
              onClick={onCloseModal}
              className="bg-white hover:bg-gray-100 border-gray-100"
            >
              <CloseOutlined className="text-lg text-primary-9!" />
            </Button>
          </div>
        </div>
      }
      size="auto"
      onClose={onCloseModal}
      position="center"
      animation="scale"
      maxWidth={700}
      width={700}
      className={cn(
        'bg-white! fixed! top-1/2! left-1/2! z-1000! -translate-x-1/2! -translate-y-1/2! transform!',
        'flex h-190 flex-col rounded-2xl'
      )}
      headerClassName={cn('[&>div]:w-full shrink-0')}
      overlayClassName="bg-primary-8/10 backdrop-blur-xs"
      bodyClassName={cn(
        'min-h-0 flex-1 overflow-auto px-0 pt-0 pb-0 secondary-scrollbar rounded-b-2xl!',
        isSelectionMode && activeAction === null && 'flex items-center justify-center'
      )}
    >
      {isSelectionMode && activeAction === null ? (
        <CreditsActionSelection onSelect={setSelectedAction} />
      ) : activeAction === CreditsAction.Transfer.key ? (
        <div className="h-full bg-white px-5 rounded-b-2xl!">
          <TransferCredits
            virtualLabId={virtualLabId}
            onBack={handleBack}
            shouldHaveBack={false}
            shouldShowSwap={false}
            ref={creditsRef}
            classnames={{
              root: 'bg-white px-0 pt-1 h-full',
              content: 'bg-white px-0 rounded-2xl h-full',
              body: 'border-none bg-white p-0 px-2 h-[calc(100%-30px)]',
              footer: 'mt-auto',
            }}
          />
        </div>
      ) : (
        <div className="h-full bg-white px-8 rounded-b-2xl!">
          <BuyCreditsTab
            virtualLabId={virtualLabId}
            onClose={resetBuyMode}
            mode={buyMode}
            onModeChange={setBuyMode}
            classnames={{
              mode: {
                root: 'py-0',
              },
              flow: {
                root: 'pt-1 bg-white rounded-2xl [&_.back-button-wrapper]:pt-0',
                emailVerification: {
                  codeForm: 'px-10',
                  requestForm: 'pt-1 bg-white rounded-2xl [&_.back-button-wrapper]:pt-0 px-10',
                },
              },
              promotion: {
                root: 'pt-1 bg-white rounded-2xl [&_.back-button-wrapper]:pt-0',
              },
            }}
          />
        </div>
      )}
    </Modal>
  );
}

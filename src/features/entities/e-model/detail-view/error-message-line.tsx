import { WarningFilled } from '@ant-design/icons';

import { type TViewVariant, ViewVariant } from '@/constants';
import { Header } from '@/features/entities/e-model/detail-view/header';
import { detailViewInsetPanelClass } from '@/ui/segments/detail-view/variant-styles';
import { cn } from '@/utils/css-class';

import type { ReactNode } from 'react';

type Props = {
  message?: ReactNode;
};

export default function ErrorMessageLine({ message }: Props) {
  if (!message) return null;

  return <div className="text-xs text-red-400">{message}</div>;
}

function ErrorMessageBox({ message }: Props) {
  return (
    <div className="border-error text-error flex items-center justify-center gap-4 border p-16 text-xl">
      <WarningFilled style={{ fontSize: 24 }} />
      {message}
    </div>
  );
}

function InfoMessageBox({
  message,
  variant = ViewVariant.Light,
}: Props & { variant?: TViewVariant }) {
  return (
    <div
      className={cn(
        'flex items-center justify-center gap-4 border p-16 text-xl',
        variant === ViewVariant.Default
          ? cn(detailViewInsetPanelClass(variant), 'text-primary-7')
          : 'border-neutral-3 text-neutral-4'
      )}
    >
      {message}
    </div>
  );
}

export function StandardFallback({
  children,
  type,
  message,
  variant = ViewVariant.Light,
}: {
  children: ReactNode;
  type: 'error' | 'info';
  message?: ReactNode;
  variant?: TViewVariant;
}) {
  function renderSwitch() {
    switch (type) {
      case 'error':
        return <ErrorMessageBox message={message ?? 'No information available'} />;
      case 'info':
        return <InfoMessageBox message={message ?? 'No information available'} variant={variant} />;
      default:
        return undefined;
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Header variant={variant}>{children}</Header>
      {renderSwitch()}
    </div>
  );
}

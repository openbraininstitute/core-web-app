import { WarningFilled } from '@ant-design/icons';

import { Header } from '@/features/entities/e-model/detail-view/header';

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

function InfoMessageBox({ message }: Props) {
  return (
    <div className="border-neutral-3 text-neutral-4 flex items-center justify-center gap-4 border p-16 text-xl">
      {message}
    </div>
  );
}

export function StandardFallback({
  children,
  type,
  message,
}: {
  children: ReactNode;
  type: 'error' | 'info';
  message?: ReactNode;
}) {
  function renderSwitch() {
    switch (type) {
      case 'error':
        return <ErrorMessageBox message={message ?? 'No information available'} />;
      case 'info':
        return <InfoMessageBox message={message ?? 'No information available'} />;
      default:
        return undefined;
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Header>{children}</Header>
      {renderSwitch()}
    </div>
  );
}

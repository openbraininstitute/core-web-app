'use client';

import { WarningOutlined } from '@ant-design/icons';
import { Card } from 'antd';

type Props = {
  message: string;
  isAdmin: boolean;
  adminEmail?: string;
  onAddCredits?: () => void;
};

export function InsufficientCreditsCard({ message, isAdmin, adminEmail, onAddCredits }: Props) {
  return (
    <Card size="small" className="border-warning/30 bg-warning/5 w-full max-w-md shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <p className="text-primary-9 m-0 text-sm leading-normal">{message}</p>
          {isAdmin ? (
            <button
              type="button"
              onClick={onAddCredits}
              className="text-primary-9 border-neutral-3 w-fit cursor-pointer rounded-full border bg-white px-5 py-1.5 text-sm font-semibold transition-colors hover:bg-gray-50"
            >
              Add credits
            </button>
          ) : adminEmail ? (
            <a
              href={`mailto:${adminEmail}?subject=Insufficient%20credits`}
              className="text-primary-9 border-neutral-3 w-fit rounded-full border bg-white px-5 py-1.5 text-sm font-semibold no-underline transition-colors hover:bg-gray-50"
            >
              Contact admin
            </a>
          ) : (
            <p className="m-0 text-xs text-gray-500">
              Contact your virtual lab administrator to request credits.
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}

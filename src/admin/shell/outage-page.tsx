'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { SharedLayout } from '@/ui/layouts/shared-layout';
import { Button } from '@/ui/molecules/button';

export function OutagePage({ retry }: { retry: () => void }) {
  const pathname = usePathname();

  return (
    <SharedLayout>
      <div className="flex max-w-md flex-col items-center gap-6">
        <div className="flex w-full flex-col items-center gap-3 text-center">
          <h1 className="text-primary-9 text-3xl font-bold">Admin couldn&apos;t load</h1>
          <p className="text-xl font-light text-gray-500">
            Operator access couldn&apos;t be checked. The sign-in service may not be answering, or
            your session there may have ended.
          </p>
        </div>
        <div className="flex gap-3">
          <Button rounded variant="success" size="lg" onClick={retry} className="font-bold">
            Try again
          </Button>
          <Button rounded asChild variant="outline" size="lg" className="font-bold">
            <Link href={`/app/log-in?reauth=1&callbackUrl=${encodeURIComponent(pathname)}`}>
              Sign in again
            </Link>
          </Button>
        </div>
      </div>
    </SharedLayout>
  );
}

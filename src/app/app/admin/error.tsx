'use client';

import Link from 'next/link';

import { PLATFORM_HOME } from '@/features/admin/routes';
import { SharedLayout } from '@/ui/layouts/shared-layout';
import { Button } from '@/ui/molecules/button';

// Sits above `(protected)`: an error boundary doesn't wrap the layout of its own segment, and
// that layout is where a Keycloak outage throws.
export default function AdminError({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <SharedLayout>
      <div className="flex max-w-md flex-col items-center gap-6">
        <div className="flex w-full flex-col items-center gap-3 text-center">
          <h1 className="text-primary-9 text-3xl font-bold">Admin couldn&apos;t load</h1>
          <p className="text-xl font-light text-gray-500">
            Operator access couldn&apos;t be checked, usually because the sign-in service isn&apos;t
            answering. Try again in a moment.
          </p>
        </div>
        <div className="flex gap-3">
          <Button rounded variant="success" size="lg" onClick={retry} className="font-bold">
            Try again
          </Button>
          <Button rounded asChild variant="outline" size="lg" className="font-bold">
            <Link href={PLATFORM_HOME}>Go to the homepage</Link>
          </Button>
        </div>
      </div>
    </SharedLayout>
  );
}

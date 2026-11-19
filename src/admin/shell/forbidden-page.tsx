import Link from 'next/link';

import { SharedLayout } from '@/ui/layouts/shared-layout';
import { Button } from '@/ui/molecules/button';

import { PLATFORM_HOME } from '../routes';

export function ForbiddenPage() {
  return (
    <SharedLayout>
      <div className="flex max-w-md flex-col items-center gap-6">
        <div className="flex w-full flex-col items-center text-center">
          <h1 className="text-primary-9 text-8xl font-bold">403</h1>
          <p className="text-primary-8 text-xl font-semibold">
            You don&apos;t have access to Admin.
          </p>
          <p className="my-5 text-xl font-light text-gray-500">
            Admin is available to platform operators only.
          </p>
        </div>
        <Button rounded asChild variant="success" size="lg" className="font-bold">
          <Link href={PLATFORM_HOME}>Go to the homepage</Link>
        </Button>
      </div>
    </SharedLayout>
  );
}

import Link from 'next/link';

import { SharedLayout } from '@/ui/layouts/shared-layout';
import { Icon } from '@/ui/segments/offline-consent/icon';
import { Button } from '@/ui/molecules/button';
import { env } from '@/env';

import type { ServerSideComponentProp } from '@/types/common';

export default async function Page({
  searchParams,
}: ServerSideComponentProp<null, { error: string; description: string }>) {
  const { description, error } = await searchParams;

  const isSuccess = !error && !description;
  const title = isSuccess ? 'Consent Granted Successfully' : 'Consent Error';
  const subtitle = isSuccess
    ? 'Your consent has been recorded and accepted.'
    : 'An error occurred during the consent process';

  const hint = isSuccess
    ? 'You can now close this window and return to your application.'
    : 'Please try again or contact support if this error persists.';

  return (
    <SharedLayout>
      <div className="flex flex-col items-center justify-center space-y-8 p-8">
        <div className="text-center">
          <Icon isSuccess={isSuccess} />
          <h1 className="mb-4 text-3xl font-bold text-gray-900 dark:text-white">{title}</h1>
          <p className="mb-2 text-lg text-gray-600 dark:text-gray-300">{subtitle}</p>
          <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">{hint}</p>

          {env.NEXT_PUBLIC_DEPLOYMENT_ENV !== 'production' && (error || description) && (
            <div className="mt-6 rounded-lg bg-gray-100 p-4 text-left dark:bg-gray-800">
              <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">Debug Information:</p>
              {error && <p className="text-xs">Error Code: {error}</p>}
              {description && <p className="text-xs">Description: {description}</p>}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4 sm:flex-row">
          <Button asChild rounded variant="success" className="md:h-10 lg:h-12">
            <Link href="/app/virtual-lab/sync">Back to Application</Link>
          </Button>
        </div>
      </div>
    </SharedLayout>
  );
}

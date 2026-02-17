import Link from 'next/link';

import { SharedLayout } from '@/ui/layouts/shared-layout';
import { Button } from '@/ui/molecules/button';

export default function Custom403() {
  return (
    <SharedLayout>
      <div className="flex max-w-md flex-col items-center gap-6">
        <div className="mx-auto flex w-full max-w-md flex-col items-center justify-center">
          <h1 className="text-primary-9 text-8xl font-bold">403</h1>
          <p className="text-primary-8 text-xl font-semibold">
            You don&apos;t have permission to access this project.
          </p>
          <p className="text-xl font-light text-center text-gray-500 my-5">
            Please check that you are a member of the virtual lab and project, or reach out to the
            project administrator to request access.
          </p>
        </div>
        <Button
          rounded
          variant="success"
          type="button"
          size={'lg'}
          className="disabled:bg-neutral-1 xl:h-12 h:10 max-w-max disabled:text-neutral-4! w-full px-8! py-6! font-bold hover:text-white"
        >
          <Link href="/app/virtual-lab/sync" className="flex items-center justify-center gap-3.5">
            <span>Go to the homepage</span>
          </Link>
        </Button>
      </div>
    </SharedLayout>
  );
}

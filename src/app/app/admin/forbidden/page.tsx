import Link from 'next/link';

import { PLATFORM_HOME } from '@/features/admin/routes';
import { SharedLayout } from '@/ui/layouts/shared-layout';
import { Button } from '@/ui/molecules/button';

// Sits outside `(protected)`, because that layout redirects here.
export default function AdminForbiddenPage() {
  return (
    <SharedLayout>
      <div className="flex flex-col items-center gap-4">
        <h1 className="text-primary-9 text-xl font-bold">Access restricted</h1>
        <p className="text-neutral-4">Admin is available to platform operators only.</p>
        <Button rounded asChild variant="outline" size="md">
          <Link href={PLATFORM_HOME}>Back to platform</Link>
        </Button>
      </div>
    </SharedLayout>
  );
}

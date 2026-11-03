import Link from 'next/link';

import { Button } from '@/ui/molecules/button';

// Sits outside `(protected)`, because that layout redirects here.
export default function AdminForbiddenPage() {
  return (
    <div className="bg-background flex h-screen w-full flex-col items-center justify-center gap-4">
      <h1 className="text-primary-9 text-xl font-bold">Access restricted</h1>
      <p className="text-neutral-4">Admin is available to platform operators only.</p>
      <Button rounded asChild variant="outline" size="md">
        <Link href="/app/virtual-lab/sync">Back to platform</Link>
      </Button>
    </div>
  );
}

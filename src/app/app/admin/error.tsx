'use client';

import { OutagePage } from '@/admin/shell/outage-page';

// Sits above `(protected)`: an error boundary doesn't wrap the layout of its own segment, and
// that layout is where a Keycloak outage throws.
export default function AdminError({ retry }: { retry: () => void }) {
  return <OutagePage retry={retry} />;
}

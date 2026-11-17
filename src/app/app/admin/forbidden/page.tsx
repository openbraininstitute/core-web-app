import { ForbiddenPage } from '@/admin/shell/forbidden-page';

// Sits outside `(protected)`, because that layout redirects here.
export default function AdminForbiddenPage() {
  return <ForbiddenPage />;
}

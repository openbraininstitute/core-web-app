import { LoginRedirect } from '@/features/auth/components/login-redirect';

import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Log in' };

export default function Page() {
  return <LoginRedirect />;
}

import { ReactNode } from 'react';
import { PageTransition } from '@/ui/segments/workflows/page-transition';

export default function Template({ children }: { children: ReactNode }) {
  return <PageTransition>{children}</PageTransition>;
}

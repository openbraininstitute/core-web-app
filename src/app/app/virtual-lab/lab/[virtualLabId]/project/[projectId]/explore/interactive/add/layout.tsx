import { ReactNode } from 'react';
import ContributeLayout from '@/components/explore-section/ContributeLayout';

export default function ContributeDataLayout({ children }: { children: ReactNode }) {
  console.log('ContributeDataLayout function entered');
  return <ContributeLayout>{children}</ContributeLayout>;
}

import { ReactNode } from 'react';
import ContributeLayout from '@/components/explore-section/ContributeLayout';

export default function ContributeDataLayout({ children }: { children: ReactNode }) {

  return <ContributeLayout>{children}</ContributeLayout>;
}

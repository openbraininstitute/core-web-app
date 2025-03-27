'use client';

import { ErrorBoundary } from 'react-error-boundary';
import { LabDetailBanner } from '../VirtualLabBanner';
import WelcomeUserBanner from './WelcomeUserBanner';
import { useUnwrappedValue } from '@/hooks/hooks';
import { virtualLabDetailAtomFamily } from '@/state/virtual-lab/lab';

export default function VirtualLabHome({ id }: { id: string }) {
  const result = useUnwrappedValue(virtualLabDetailAtomFamily(id));

  return (
    <>
      <WelcomeUserBanner title={result?.virtual_lab.name} />
      <ErrorBoundary fallback={null}>
        <LabDetailBanner vlab={result?.virtual_lab ?? undefined} />
      </ErrorBoundary>
    </>
  );
}

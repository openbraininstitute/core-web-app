import { ReactNode } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import ErrorComponent from '@/app/app/virtual-lab/(home)/error';

export default async function VirtualLabLayout({ children }: { children: ReactNode }) {
  return <ErrorBoundary FallbackComponent={ErrorComponent}>{children}</ErrorBoundary>;
}

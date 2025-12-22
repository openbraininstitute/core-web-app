'use client';

import { ReactNode, Suspense } from 'react';

import { LoadingOutlined } from '@ant-design/icons';

type Props = {
  children: ReactNode;
};

function Loading() {
  return (
    <div className="text-neutral-1 flex items-center justify-center text-3xl">
      <LoadingOutlined />
    </div>
  );
}

export function DefaultLoadingSuspense({ children }: Props) {
  return <Suspense fallback={<Loading />}>{children}</Suspense>;
}

export default DefaultLoadingSuspense;

'use client';

import useSessionState from '@/hooks/session';

import type { ReactElement, ReactNode } from 'react';

type SessionStateWrapperProps = {
  children: ReactNode;
};

export default function SessionStateProvider({ children }: SessionStateWrapperProps) {
  useSessionState();

  return children as ReactElement<any>;
}

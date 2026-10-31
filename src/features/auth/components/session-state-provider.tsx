'use client';

import useSessionState from '@/features/auth/client/use-session-state';

import type { ReactElement, ReactNode } from 'react';

type SessionStateWrapperProps = {
  children: ReactNode;
};

export default function SessionStateProvider({ children }: SessionStateWrapperProps) {
  useSessionState();

  return children as ReactElement<any>;
}

'use client';

import useSessionState from '@/features/auth/client/use-session-state';

import type { ReactElement, ReactNode } from 'react';

type TSessionStateWrapperProps = {
  children: ReactNode;
};

export default function SessionStateProvider({ children }: TSessionStateWrapperProps) {
  useSessionState();

  return children as ReactElement<any>;
}

'use client';

import type { ReactElement, ReactNode } from 'react';
import useSessionState from '@/hooks/session';

type SessionStateWrapperProps = {
  children: ReactNode;
};

export default function SessionStateProvider({ children }: SessionStateWrapperProps) {
  useSessionState();

  return children as ReactElement<any>;
}

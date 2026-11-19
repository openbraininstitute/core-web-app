// Node views render through portals, so they read the project and log from context.
import { isNil } from 'es-toolkit';
import { createContext, useContext } from 'react';

import type { IProject } from '@/features/logbook/auth/session';

export interface ILogContext {
  readonly project: IProject;
  readonly logId: string;
}

export const LogContext = createContext<ILogContext | null>(null);

export function useLogContext(): ILogContext {
  const context = useContext(LogContext);
  if (isNil(context)) throw new Error('A block is rendered outside an open log');
  return context;
}

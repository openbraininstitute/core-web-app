import { useHocuspocusProvider } from '@hocuspocus/provider-react';
import { isNil } from 'es-toolkit';
import { createContext, useContext } from 'react';

import type { ILogContext, TOpenEntityDetail, TOpenEntityPicker } from '@/features/logbook/types';

export const useLivePage = () => useHocuspocusProvider();

export const LogContext = createContext<ILogContext | null>(null);

export const EntityPickerContext = createContext<TOpenEntityPicker | null>(null);

export const useEntityPicker = (): TOpenEntityPicker | null => useContext(EntityPickerContext);

export const EntityDetailContext = createContext<TOpenEntityDetail | null>(null);

export const useEntityDetail = (): TOpenEntityDetail | null => useContext(EntityDetailContext);

export function useLogContext(): ILogContext {
  const context = useContext(LogContext);
  if (isNil(context)) throw new Error('A block is rendered outside an open log');
  return context;
}

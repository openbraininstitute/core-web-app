// Node views render through portals, so they read the project and log from context.
import { useHocuspocusProvider } from '@hocuspocus/provider-react';
import { isNil } from 'es-toolkit';
import { createContext, useContext } from 'react';

import type { IProject } from '@/features/logbook/auth/session';

/** The open page's collaboration provider; the one wrapper of `useHocuspocusProvider`. */
export const useLivePage = () => useHocuspocusProvider();

export interface ILogContext {
  readonly project: IProject;
  readonly logId: string;
}

export const LogContext = createContext<ILogContext | null>(null);

export interface IPickedEntity {
  readonly id: string;
  readonly type: string;
  readonly name: string;
}

/** Opens the link-entity picker; `onPick` gets the chosen entity. Null where the log can't be edited. */
export type TOpenEntityPicker = (onPick: (entity: IPickedEntity) => void) => void;

export const EntityPickerContext = createContext<TOpenEntityPicker | null>(null);

export const useEntityPicker = (): TOpenEntityPicker | null => useContext(EntityPickerContext);

export interface IEntityTarget {
  readonly type: string;
  readonly entityId: string;
}

/** Opens core's detail panel for an entity, beside the log. */
export type TOpenEntityDetail = (target: IEntityTarget) => void;

export const EntityDetailContext = createContext<TOpenEntityDetail | null>(null);

export const useEntityDetail = (): TOpenEntityDetail | null => useContext(EntityDetailContext);

export function useLogContext(): ILogContext {
  const context = useContext(LogContext);
  if (isNil(context)) throw new Error('A block is rendered outside an open log');
  return context;
}

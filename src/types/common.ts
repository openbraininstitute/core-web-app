'use client';

import { z } from 'zod';
/**
 * Constructs a type based on T and makes properties K optional.
 *
 * @example
 * type User = { name: string, id: string }
 *
 * type UserWithOptionalId = PartialBy<User, 'id'>
 * // this is similar to { name: string, id?: string }
 */
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * Constructs a uniot type, properties from the second type take precedence when there is a conflict.
 */
export type Merge<A, B> = Omit<A, keyof B> & B;

export type ErrorComponentProps = {
  error: Error;
  reset: () => void;
};

export type BrainRegionIdx = number;

export type SelectOption = {
  value: string;
  label: string;
  isDisabled?: boolean;
};

export type ApplicationSection = 'explore' | 'build' | 'simulate';

export interface ServerSideComponentProp<Params, SearchParams> {
  params: Promise<Params>;
  searchParams: Promise<SearchParams>;
}

export interface ServerSideLayoutProp<Params> {
  params: Promise<Params>;
}

export const WorkspaceContextSchema = z.object({
  virtualLabId: z.string(),
  projectId: z.string(),
});

export type WorkspaceContext = z.infer<typeof WorkspaceContextSchema>;
export type AwaitedType<T> = T extends Promise<infer U> ? U : T;

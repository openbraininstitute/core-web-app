'use client';

import { createContext, useContext } from 'react';

export type ApprovalResponseFn = (params: {
  id: string;
  approved: boolean;
  reason?: string;
}) => void | PromiseLike<void>;

export const ApprovalContext = createContext<ApprovalResponseFn | null>(null);

export function useApprovalResponse(): ApprovalResponseFn | null {
  return useContext(ApprovalContext);
}

import { customAlphabet } from 'nanoid';

export const WorkflowSessionIdPrefix = 'wf_' as const;
export const WorkflowSessionIdSuffixLength = 10 as const;

export const workflowSessionAlphabet = customAlphabet(
  'abcdefghijklmnopqrstuvwxyz0123456789',
  WorkflowSessionIdSuffixLength
);

export function createWorkflowSessionId(): string {
  return `${WorkflowSessionIdPrefix}${workflowSessionAlphabet(WorkflowSessionIdSuffixLength)}`;
}

export function isWorkflowSessionId(value: string | null | undefined): value is string {
  if (!value) return false;
  return (
    value.startsWith(WorkflowSessionIdPrefix) &&
    value.length === WorkflowSessionIdPrefix.length + WorkflowSessionIdSuffixLength
  );
}

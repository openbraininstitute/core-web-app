import { ToolInvocationUIPart } from '@ai-sdk/ui-utils';
import { logError } from '@/util/logger';

interface ToolResult {
  input: unknown;
  output: unknown;
}

export function extractTool(part: ToolInvocationUIPart, toolName: string): ToolResult | null {
  if (part.type !== 'tool-invocation') return null;
  if (part.toolInvocation.toolName !== toolName) return null;
  if (part.toolInvocation.state !== 'result') return null;

  const invocation = part.toolInvocation;
  try {
    return {
      input: invocation.args,
      output: JSON.parse(invocation.result),
    };
  } catch {
    logError(
      `We expected the result for tool "${toolName}" to be JSON parsable:`,
      invocation.result
    );
    return null;
  }
}

export function uniquify<T, Q>(arr: T[], getId: (item: T) => Q): T[] {
  const set = new Set<Q>();
  const result: T[] = [];
  for (const item of arr) {
    const id = getId(item);
    if (set.has(id)) continue;

    set.add(id);
    result.push(item);
  }
  return result;
}

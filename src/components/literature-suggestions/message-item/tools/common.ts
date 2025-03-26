import { UIMessage } from '@ai-sdk/ui-utils';
import { logError } from '@/util/logger';

interface ToolResult {
  input: unknown;
  output: unknown;
}

export function extractTool(message: UIMessage, toolName: string): ToolResult[] {
  const results: ToolResult[] = [];
  for (const part of message.parts) {
    if (part.type !== 'tool-invocation') continue;
    if (part.toolInvocation.toolName !== toolName) continue;
    if (part.toolInvocation.state !== 'result') continue;

    const invocation = part.toolInvocation;
    try {
      results.push({
        input: invocation.args,
        output: JSON.parse(invocation.result),
      });
    } catch {
      logError(
        `We expected the result for tool "${toolName}" to be JSON parsable:`,
        invocation.result
      );
    }
  }
  return results;
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

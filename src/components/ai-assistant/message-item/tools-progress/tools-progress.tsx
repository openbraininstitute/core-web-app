import React from 'react';
import { UIMessage } from '@ai-sdk/ui-utils';

import Link from 'next/link';
import { IconGear } from '../../icons/gear';
import { useAITools } from '@/services/ai-agent/tools/tools';
import { classNames } from '@/util/utils';
import { AIAssistantTool } from '@/services/ai-agent/tools/ai-assistant-tool';

import styles from './tools-progress.module.css';

interface ToolsProgressProps {
  className?: string;
  message: UIMessage;
}

export default function ToolsProgress({ className, message }: ToolsProgressProps) {
  const tools = useAITools();
  if (!tools) return null;

  const toolsStates = getToolsState(message, tools);
  if (toolsStates.length === 0) return null;

  return (
    <div className={classNames(className, styles.toolsProgress)}>
      {toolsStates.map(({ tool, state }) => {
        const Icon = tool.icon;

        return (
          <Link
            className={styles.toolState}
            key={tool.id}
            href={tool.docURL}
            target="documentation"
            onClick={() =>
              // eslint-disable-next-line no-console
              console.info('Tool content:', tool, extractToolsInvocations(message, tool.id))
            }
          >
            {state === 'result' ? <Icon /> : <IconGear className={styles.spin} />}
            <div className={styles.name}>{tool.name}</div>
            <div className={styles.state}>{state === 'result' ? 'done' : 'running'}</div>
          </Link>
        );
      })}
    </div>
  );
}

type ToolsStates = Array<{
  tool: AIAssistantTool;
  state: 'partial-call' | 'call' | 'result';
}>;

function getToolsState(message: UIMessage, tools: AIAssistantTool[]): ToolsStates {
  const { parts } = message;
  if (!parts || parts.length === 0) return [];

  const toolsStates = new Map<string, 'partial-call' | 'call' | 'result'>();
  for (const part of parts) {
    if (part.type !== 'tool-invocation') continue;

    const { toolName, state } = part.toolInvocation;
    const lastState = toolsStates.get(toolName);
    if (!lastState) toolsStates.set(toolName, state);
    else if (lastState === 'result') {
      toolsStates.set(toolName, state);
    }
  }
  const result: ToolsStates = [];
  for (const toolName of toolsStates.keys()) {
    const tool = tools.find((item) => item.id === toolName);
    const state = toolsStates.get(toolName);
    if (!tool || !state) continue;

    result.push({ tool, state });
  }
  return result;
}

function extractToolsInvocations(message: UIMessage, id: string): any {
  return message.parts
    .filter((part) => part.type === 'tool-invocation')
    .map((part) => part.toolInvocation)
    .filter((tool) => tool.toolName === id);
}

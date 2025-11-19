import React, { useState } from 'react';
import { UIMessage, ToolInvocation } from '@ai-sdk/ui-utils';
import Link from 'next/link';
import { IconGear } from '../../icons/gear';
import LoadingDots from './loading-dots/loading-dots';
import { cn } from '@/utils/css-class';

import HelpIconI from '@/components/icons/HelpIcon';
import { CheckIcon } from '@/components/icons';
import Chevron from '@/components/icons/Chevron';

import { useAITools } from '@/services/ai-agent/tools/tools';
import { AIAssistantTool } from '@/services/ai-agent/tools/ai-assistant-tool';

import styles from './tools-progress.module.css';

interface ToolsProgressProps {
  className?: string;
  message: UIMessage;
}

export default function ToolsProgress({ className, message }: ToolsProgressProps) {
  const tools = useAITools();
  const [expandedToolKey, setExpandedToolKey] = useState<string | null>(null);

  if (!tools) return null;

  const toolsStates = getToolsState(message, tools);
  if (toolsStates.length === 0) return null;

  return (
    <div className={cn(styles.container, className)}>
      {toolsStates.map(({ tool, state, invocation, key }) => {
        const Icon = tool.icon;
        const isExpanded = expandedToolKey === key;
        const isRunning = state !== 'result';

        return (
          <div
            className={cn(
              styles.card,
              isRunning && styles.cardRunning,
              isExpanded && styles.cardExpanded
            )}
            key={key}
          >
            {/* Header */}
            <div className={styles.header}>
              <div className={cn(styles.iconWrapper, isRunning && styles.iconWrapperRunning)}>
                {isRunning ? <IconGear className={styles.spinningIcon} /> : <Icon />}
              </div>

              <div className={styles.content}>
                <div className={styles.toolName}>{tool.name}</div>

                <div
                  className={cn(
                    styles.status,
                    isRunning ? styles.statusRunning : styles.statusComplete
                  )}
                >
                  {isRunning ? (
                    <>
                      <LoadingDots />
                      <span className={styles.statusText}>Running</span>
                    </>
                  ) : (
                    <>
                      <CheckIcon className={styles.checkIcon} />
                      <span>Complete</span>
                    </>
                  )}
                </div>
              </div>

              <div className={styles.actions}>
                <button
                  className={styles.expandButton}
                  onClick={() => setExpandedToolKey(isExpanded ? null : key)}
                  aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
                  aria-expanded={isExpanded}
                  type="button"
                >
                  <Chevron className={cn(styles.chevron, isExpanded && styles.chevronExpanded)} />
                </button>

                <Link
                  href={tool.docURL}
                  target="documentation"
                  aria-label="Tool information"
                  className={cn(styles.helpButton)}
                  onClick={(e) => e.stopPropagation()}
                >
                  <HelpIconI className={styles.helpIcon} />
                </Link>
              </div>
            </div>

            {/* Expandable Details */}
            {invocation && (
              <div
                className={cn(
                  styles.details,
                  isExpanded ? styles.detailsOpen : styles.detailsClosed
                )}
                aria-hidden={!isExpanded}
                role="region"
                aria-label={`${tool.name} details`}
              >
                <div className={styles.detailsInner}>
                  {invocation.args && Object.keys(invocation.args).length > 0 && (
                    <div className={styles.section}>
                      <div className={styles.sectionTitle}>Arguments</div>
                      <pre className={styles.codeBlock}>{formatInputOutputs(invocation.args)}</pre>
                    </div>
                  )}

                  {invocation.state === 'result' && invocation.result && (
                    <div className={styles.section}>
                      <div className={styles.sectionTitle}>Result</div>
                      <pre className={styles.codeBlock}>
                        {formatInputOutputs(invocation.result)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

type ToolsStates = Array<{
  tool: AIAssistantTool;
  state: 'partial-call' | 'call' | 'result';
  invocation: ToolInvocation;
  key: string;
}>;

function getToolsState(message: UIMessage, tools: AIAssistantTool[]): ToolsStates {
  const parts = message?.parts || [];
  const result: ToolsStates = [];

  parts.forEach((part, idx) => {
    if (part.type !== 'tool-invocation') return;
    const invocation = part.toolInvocation;
    if (!invocation || !invocation.toolName) return;
    const tool = tools.find((t) => t.id === invocation.toolName);
    if (!tool) return;
    const keyBase = (invocation.toolName ?? 'tool') as string;
    const key = `${keyBase}-${idx}`;
    result.push({
      tool,
      state: invocation.state,
      invocation,
      key,
    });
  });

  return result;
}

function formatInputOutputs(r: unknown): string {
  try {
    if (typeof r === 'string') {
      // try parse stringified JSON first
      return JSON.stringify(JSON.parse(r), null, 2);
    }
    return JSON.stringify(r, null, 2);
  } catch {
    // fallback to plain string
    return String(r);
  }
}

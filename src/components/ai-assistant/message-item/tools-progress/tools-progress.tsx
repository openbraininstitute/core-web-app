import React, { useState } from 'react';
import { ToolInvocation, ToolInvocationUIPart } from '@ai-sdk/ui-utils';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
  part: ToolInvocationUIPart;
}

export default function ToolsProgress({ className, part }: ToolsProgressProps) {
  const tools = useAITools();
  const currentPath = usePathname();
  const [expandedToolKeys, setExpandedToolKeys] = useState<Set<string>>(new Set());

  const toggleExpanded = (key: string) => {
    setExpandedToolKeys((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  if (!tools) return null;

  const toolsState = getToolsState(part, tools);
  if (toolsState === null) return null;

  const { tool, state, invocation, key } = toolsState;
  const Icon = tool.icon;
  const isExpanded = expandedToolKeys.has(key);
  const isRunning = state !== 'result';

  return (
    <div className={cn(styles.container, className)}>
      <div
        className={cn(
          styles.card,
          isRunning && styles.cardRunning,
          isExpanded && styles.cardExpanded
        )}
        key={key}
      >
        {/* Header */}
        <button
          className={styles.header}
          onClick={() => toggleExpanded(key)}
          aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
          aria-expanded={isExpanded}
          type="button"
        >
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
            <div className={styles.expandButton}>
              <Chevron className={cn(styles.chevron, isExpanded && styles.chevronExpanded)} />
            </div>

            <Link
              href={tool.docURL(currentPath)}
              target="documentation"
              aria-label="Tool information"
              className={cn(styles.helpButton)}
              onClick={(e) => e.stopPropagation()}
            >
              <HelpIconI className={styles.helpIcon} />
            </Link>
          </div>
        </button>

        {/* Expandable Details */}
        {invocation && (
          <div
            className={cn(styles.details, isExpanded ? styles.detailsOpen : styles.detailsClosed)}
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
                  <pre className={styles.codeBlock}>{formatInputOutputs(invocation.result)}</pre>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

type ToolsStates = {
  tool: AIAssistantTool;
  state: 'partial-call' | 'call' | 'result';
  invocation: ToolInvocation;
  key: string;
};

function getToolsState(part: ToolInvocationUIPart, tools: AIAssistantTool[]): ToolsStates | null {
  const invocation = part.toolInvocation;
  if (!invocation || !invocation.toolName) return null;
  const tool = tools.find((t) => t.id === invocation.toolName);
  if (!tool) return null;
  const keyBase = (invocation.toolName ?? 'tool') as string;
  const key = `${keyBase}-${tool.id}`;

  return {
    tool,
    state: invocation.state,
    invocation,
    key,
  };
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

import React, { useState } from 'react';
import Link from 'next/link';
import { ToolUIPart } from 'ai';
import { IconGear } from '../../icons/gear';
import LoadingDots from './loading-dots/loading-dots';
import { cn } from '@/utils/css-class';

import HelpIconI from '@/components/icons/HelpIcon';
import { CheckIcon } from '@/components/icons';
import Chevron from '@/components/icons/Chevron';

import { useAITools } from '@/services/ai-agent/tools/tools';
import { AIAssistantTool } from '@/services/ai-agent/tools/ai-assistant-tool';

import { useWorkspace } from '@/ui/hooks/use-workspace';
import styles from './tools-progress.module.css';

interface ToolsProgressProps {
  className?: string;
  part: ToolUIPart;
}

export default function ToolsProgress({ className, part }: ToolsProgressProps) {
  const tools = useAITools();
  const { virtualLabId, projectId } = useWorkspace();
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
  const isRunning = state !== 'output-available';

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
              href={tool.docURL(virtualLabId, projectId)}
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
              {Object.keys(invocation.input || {}).length > 0 && (
                <div className={styles.section}>
                  <div className={styles.sectionTitle}>Arguments</div>
                  <pre className={styles.codeBlock}>{formatInputOutputs(invocation.input)}</pre>
                </div>
              )}

              {invocation.state === 'output-available' && (
                <div className={styles.section}>
                  <div className={styles.sectionTitle}>Result</div>
                  <pre className={styles.codeBlock}>{formatInputOutputs(invocation.output)}</pre>
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
  state: 'input-streaming' | 'input-available' | 'output-available' | 'output-error';
  invocation: ToolUIPart;
  key: string;
};

function getToolsState(part: ToolUIPart, tools: AIAssistantTool[]): ToolsStates | null {
  if (!part) return null;
  const tool = tools.find((t) => t.id === part.type.slice(5));
  if (!tool) return null;
  const key = part.type.slice(5);

  return {
    tool,
    state: part.state,
    invocation: part,
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

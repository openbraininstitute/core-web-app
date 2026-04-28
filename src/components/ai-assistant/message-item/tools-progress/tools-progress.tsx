import { type DynamicToolUIPart, getToolName, type ToolUIPart } from 'ai';
import Link from 'next/link';
import { useState } from 'react';

import { CheckIcon } from '@/components/icons';
import CrossIcon from '@/components/icons/Cross';
import Chevron from '@/components/icons/Chevron';
import HelpIconI from '@/components/icons/HelpIcon';
import { useAITools } from '@/services/ai-agent/tools/tools';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { cn } from '@/utils/css-class';

import { IconGear } from '../../icons/gear';
import LoadingDots from './loading-dots/loading-dots';

import type { AIAssistantTool } from '@/services/ai-agent/tools/ai-assistant-tool';

import styles from './tools-progress.module.css';

interface ToolsProgressProps {
  className?: string;
  part: ToolUIPart | DynamicToolUIPart;
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

  const { tool, state, key } = toolsState;
  const Icon = tool.icon;
  const isExpanded = expandedToolKeys.has(key);
  const isRunning = state !== 'output-available' && state !== 'output-error';
  const isError = state === 'output-error';
  const isStateToolCall = getToolName(part) === 'editstate' || getToolName(part) === 'getstate';
  const showRestore = isStateToolCall && !isRunning && !isError;

  return (
    <div className={cn(styles.container, className)}>
      <div
        className={cn(
          styles.card,
          isRunning && styles.cardRunning,
          isError && styles.cardError,
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
                isRunning && styles.statusRunning,
                isError && styles.statusError,
                !isRunning && !isError && styles.statusComplete
              )}
            >
              {isRunning ? (
                <>
                  <LoadingDots />
                  <span className={styles.statusText}>Running</span>
                </>
              ) : isError ? (
                <>
                  <CrossIcon className={styles.checkIcon} />
                  <span>Error</span>
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
        <div
          className={cn(styles.details, isExpanded ? styles.detailsOpen : styles.detailsClosed)}
          aria-hidden={!isExpanded}
          role="region"
          aria-label={`${tool.name} details`}
        >
          <div className={styles.detailsInner}>
            {part.input != null &&
            typeof part.input === 'object' &&
            Object.keys(part.input as Record<string, unknown>).length > 0 ? (
              <div className={styles.section}>
                <div className={styles.sectionTitle}>Arguments</div>
                <pre className={styles.codeBlock}>{formatInputOutputs(part.input)}</pre>
              </div>
            ) : null}

            {part.state === 'output-available' && part.output != null ? (
              <div className={styles.section}>
                <div className={styles.sectionTitle}>Result</div>
                <pre className={styles.codeBlock}>{formatInputOutputs(part.output)}</pre>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

type ToolsStates = {
  tool: AIAssistantTool;
  state: (ToolUIPart | DynamicToolUIPart)['state'];
  key: string;
};

function getToolsState(
  part: ToolUIPart | DynamicToolUIPart,
  tools: AIAssistantTool[]
): ToolsStates | null {
  const toolName = getToolName(part);
  if (!toolName) return null;
  const tool = tools.find((t) => t.id === toolName);
  if (!tool) return null;
  const key = `${toolName}-${tool.id}`;

  return {
    tool,
    state: part.state,
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

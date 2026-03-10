import Link from 'next/link';
import { useState } from 'react';
import { useAtom } from 'jotai';

import { CheckIcon } from '@/components/icons';
import Chevron from '@/components/icons/Chevron';
import HelpIconI from '@/components/icons/HelpIcon';
import { useAITools } from '@/services/ai-agent/tools/tools';
import { configStateAtom } from '@/services/ai-agent/hooks/chat';
import type { Config } from '@/features/scan-config/components/components';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { cn } from '@/utils/css-class';

import { IconGear } from '../../icons/gear';
import LoadingDots from './loading-dots/loading-dots';

import type { ToolInvocation, ToolInvocationUIPart } from '@ai-sdk/ui-utils';
import type { AIAssistantTool } from '@/services/ai-agent/tools/ai-assistant-tool';

import styles from './tools-progress.module.css';

interface ToolsProgressProps {
  className?: string;
  part: ToolInvocationUIPart;
}

export default function ToolsProgress({ className, part }: ToolsProgressProps) {
  const tools = useAITools();
  const { virtualLabId, projectId } = useWorkspace();
  const [expandedToolKeys, setExpandedToolKeys] = useState<Set<string>>(new Set());
  const [, setConfig] = useAtom(configStateAtom);

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

  const handleRestore = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Extract state directly from the tool invocation result
    if (part.toolInvocation.state !== 'result') return;
    
    try {
      const result = JSON.parse(part.toolInvocation.result as string);
      const state = result?.state?.smc_simulation_config;
      
      if (state) {
        setConfig(state as Config);
      }
    } catch (error) {
      console.error('Failed to restore state:', error);
    }
  };

  if (!tools) return null;

  const toolsState = getToolsState(part, tools);
  if (toolsState === null) return null;

  const { tool, state, invocation, key } = toolsState;
  const Icon = tool.icon;
  const isExpanded = expandedToolKeys.has(key);
  const isRunning = state !== 'result';
  const isStateToolCall = invocation.toolName === 'editstate' || invocation.toolName === 'getstate';
  const showRestore = isStateToolCall && !isRunning;

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
            {showRestore && (
              <button
                type="button"
                className={styles.restoreButton}
                onClick={handleRestore}
                title="Restore this state"
                aria-label="Restore state"
              >
                <svg
                  className={styles.restoreIcon}
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M3.5 8C3.5 5.51472 5.51472 3.5 8 3.5C10.4853 3.5 12.5 5.51472 12.5 8C12.5 10.4853 10.4853 12.5 8 12.5C6.5 12.5 5.2 11.8 4.5 10.5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                  <path
                    d="M3.5 6V8H5.5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            )}

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

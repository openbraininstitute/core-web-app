import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useAtom } from 'jotai';
import { RiResetLeftLine } from '@remixicon/react';

import { CheckIcon } from '@/components/icons';
import Chevron from '@/components/icons/Chevron';
import HelpIconI from '@/components/icons/HelpIcon';
import { useAITools } from '@/services/ai-agent/tools/tools';
import { configStateAtom } from '@/services/ai-agent/hooks/chat';
import type { Config } from '@/features/scan-config/components/components';
import { parseJSONPatches, type JSONPatchOperation } from '@/utils/diff';
import { configHighlightsAtom, configDiffsAtom, expandedRootElementsAtom, oldConfigAtom } from '@/state/config-highlights';

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
  allMessages: any[];
}

export default function ToolsProgress({ className, part, allMessages }: ToolsProgressProps) {
  const tools = useAITools();
  const { virtualLabId, projectId } = useWorkspace();
  const [expandedToolKeys, setExpandedToolKeys] = useState<Set<string>>(new Set());
  const [showDiff, setShowDiff] = useState(false);
  const [, setConfig] = useAtom(configStateAtom);
  const [, setConfigHighlights] = useAtom(configHighlightsAtom);
  const [, setConfigDiffs] = useAtom(configDiffsAtom);
  const [, setExpandedRootElements] = useAtom(expandedRootElementsAtom);
  const [, setOldConfig] = useAtom(oldConfigAtom);

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

  const findPreviousState = (): Record<string, any> | null => {
    const allToolInvocations: Array<{ toolInvocation: any }> = [];
    
    for (let i = allMessages.length - 1; i >= 0; i--) {
      const message = allMessages[i];
      if (message.parts) {
        for (let j = message.parts.length - 1; j >= 0; j--) {
          const p = message.parts[j];
          if (p.type === 'tool-invocation') {
            allToolInvocations.push({ toolInvocation: p.toolInvocation });
          }
        }
      }
    }
    
    let foundCurrent = false;
    for (const item of allToolInvocations) {
      if (foundCurrent) {
        const toolName = item.toolInvocation.toolName;
        if ((toolName === 'editstate' || toolName === 'getstate') && item.toolInvocation.state === 'result') {
          try {
            const result = JSON.parse(item.toolInvocation.result as string);
            return result?.state?.smc_simulation_config || null;
          } catch (error) {
            return null;
          }
        }
      }
      
      if (item.toolInvocation === part.toolInvocation) {
        foundCurrent = true;
      }
    }
    
    return null;
  };

  const handleViewDiffs = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newShowDiff = !showDiff;
    setShowDiff(newShowDiff);
    
    if (newShowDiff) {
      const oldState = findPreviousState();
      setOldConfig(oldState);
      
      // Set highlights for the config UI
      // Skip the first path element (smc_simulation_config wrapper) and use the second as root
      const highlights = diffs.map((diff) => {
        // Remove 'smc_simulation_config' wrapper from path
        const adjustedPath = diff.path[0] === 'smc_simulation_config' && diff.path.length > 1
          ? diff.path.slice(1)
          : diff.path;
        
        return {
          path: adjustedPath,
          type: diff.type,
        };
      });
      
      setConfigHighlights(highlights);
      
      // Also store the full diffs for field-level comparisons
      const adjustedDiffs = diffs.map((diff) => ({
        ...diff,
        path: diff.path[0] === 'smc_simulation_config' && diff.path.length > 1
          ? diff.path.slice(1)
          : diff.path,
      }));
      setConfigDiffs(adjustedDiffs);
      
      // Collect all modified root blocks
      const modifiedBlocks = new Set(
        highlights.map((h) => h.path[0]).filter((b): b is string => b !== undefined)
      );
      
      // Set all modified blocks as expanded
      setExpandedRootElements(modifiedBlocks);
    } else {
      // Clear highlights when hiding diffs
      setConfigHighlights([]);
      setConfigDiffs([]);
      setOldConfig(null);
      setExpandedRootElements(new Set(['info'])); // Reset to default
    }
  };

  // Parse JSONPatch operations from editstate arguments
  const diffs = useMemo(() => {
    if (part.toolInvocation.state !== 'result') return [];
    
    try {
      const args = part.toolInvocation.args as { patches?: JSONPatchOperation[] };
      const patches = args?.patches;
      
      if (!patches || !Array.isArray(patches)) return [];
      
      return parseJSONPatches(patches);
    } catch (error) {
      console.error('Failed to parse JSONPatch operations:', error);
      return [];
    }
  }, [part.toolInvocation]);

  if (!tools) return null;

  const toolsState = getToolsState(part, tools);
  if (toolsState === null) return null;

  const { tool, state, invocation, key } = toolsState;
  const Icon = tool.icon;
  const isExpanded = expandedToolKeys.has(key);
  const isRunning = state !== 'result';
  const isStateToolCall = invocation.toolName === 'editstate' || invocation.toolName === 'getstate';
  const showRestore = isStateToolCall && !isRunning;
  const hasDiffs = diffs.length > 0;

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
              <>
                <button
                  type="button"
                  className={styles.restoreButton}
                  onClick={handleRestore}
                  title="Restore this state"
                  aria-label="Restore state"
                >
                  <RiResetLeftLine className={styles.restoreIcon} size={16} />
                </button>
                
                {hasDiffs && (
                  <button
                    type="button"
                    className={cn(styles.diffButton, showDiff && styles.diffButtonActive)}
                    onClick={handleViewDiffs}
                    title="View differences"
                    aria-label="View differences"
                  >
                    <svg
                      className={styles.diffIcon}
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M2 4h12M2 8h12M2 12h12"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                      <circle cx="5" cy="4" r="1.5" fill="currentColor" />
                      <circle cx="11" cy="8" r="1.5" fill="currentColor" />
                      <circle cx="8" cy="12" r="1.5" fill="currentColor" />
                    </svg>
                  </button>
                )}
              </>
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

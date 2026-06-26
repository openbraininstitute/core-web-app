import { RiCloseLine } from '@remixicon/react';
import { type DynamicToolUIPart, getToolName, type ToolUIPart } from 'ai';
import Link from 'next/link';
import { useState } from 'react';

import { CheckIcon } from '@/components/icons';
import Chevron from '@/components/icons/Chevron';
import HelpIconI from '@/components/icons/HelpIcon';
import { useAITools } from '@/services/ai-agent/tools/tools';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { cn } from '@/utils/css-class';

import { IconGear } from '../../icons/gear';
import LoadingDots from './loading-dots/loading-dots';

import type { AIAssistantTool } from '@/services/ai-agent/tools/ai-assistant-tool';

import styles from './tools-progress.module.css';

export type ApprovalResponseFn = (params: {
  id: string;
  approved: boolean;
  reason?: string;
}) => void | PromiseLike<void>;

interface ToolsProgressProps {
  className?: string;
  part: ToolUIPart | DynamicToolUIPart;
  addToolApprovalResponse?: ApprovalResponseFn | null;
}

export default function ToolsProgress({
  className,
  part,
  addToolApprovalResponse,
}: ToolsProgressProps) {
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

  // Approval states
  const isApprovalRequested = state === 'approval-requested';
  const isApprovalResponded = state === 'approval-responded';
  const isOutputDenied = state === 'output-denied';

  // Running means not in a terminal state AND not in an approval state
  const isRunning =
    state !== 'output-available' &&
    state !== 'output-error' &&
    !isApprovalRequested &&
    !isApprovalResponded &&
    !isOutputDenied;
  const isError = state === 'output-error';

  const handleApprove = () => {
    if (addToolApprovalResponse && isApprovalRequested && 'approval' in part && part.approval) {
      addToolApprovalResponse({ id: part.approval.id, approved: true });
    }
  };

  const handleReject = () => {
    if (addToolApprovalResponse && isApprovalRequested && 'approval' in part && part.approval) {
      addToolApprovalResponse({ id: part.approval.id, approved: false });
    }
  };

  // Approval-requested: inline card using the same layout as other states
  if (isApprovalRequested) {
    return (
      <div className={cn(styles.container, className)}>
        <div
          className={cn(styles.card, styles.cardApproval, isExpanded && styles.cardExpanded)}
          key={key}
        >
          <div
            className={styles.header}
            onClick={() => toggleExpanded(key)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') toggleExpanded(key);
            }}
          >
            <div className={cn(styles.iconWrapper, styles.iconWrapperApproval)}>
              <Icon />
            </div>
            <div className={styles.content}>
              <div className={styles.toolName}>{tool.name}</div>
              <div className={cn(styles.status, styles.statusApproval)}>
                <span>Approval needed</span>
              </div>
            </div>
            <div className={styles.actions}>
              <span className={styles.expandButton} aria-hidden="true">
                <Chevron className={cn(styles.chevron, isExpanded && styles.chevronExpanded)} />
              </span>
              <button
                type="button"
                className={styles.rejectButton}
                onClick={(e) => {
                  e.stopPropagation();
                  handleReject();
                }}
                aria-label="Reject"
              >
                <RiCloseLine size={18} />
              </button>
              <button
                type="button"
                className={styles.approveButton}
                onClick={(e) => {
                  e.stopPropagation();
                  handleApprove();
                }}
                aria-label="Approve"
              >
                <CheckIcon style={{ width: 14, height: 10 }} />
              </button>
            </div>
          </div>

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
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Approval-responded card — show decision state while waiting for batch
  if (isApprovalResponded) {
    const wasApproved = 'approval' in part && (part as any).approval?.approved === true;

    return (
      <div className={cn(styles.container, className)}>
        <div
          className={cn(
            styles.card,
            wasApproved ? styles.cardRunning : styles.cardDenied,
            isExpanded && styles.cardExpanded
          )}
          key={key}
        >
          <button
            className={styles.header}
            onClick={() => toggleExpanded(key)}
            aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
            aria-expanded={isExpanded}
            type="button"
          >
            <div
              className={cn(
                styles.iconWrapper,
                wasApproved ? styles.iconWrapperRunning : undefined
              )}
            >
              {wasApproved ? <IconGear className={styles.spinningIcon} /> : <Icon />}
            </div>
            <div className={styles.content}>
              <div className={styles.toolName}>{tool.name}</div>
              <div
                className={cn(
                  styles.status,
                  wasApproved ? styles.statusRunning : styles.statusDenied
                )}
              >
                {wasApproved ? (
                  <>
                    <LoadingDots />
                    <span className={styles.statusText}>Resuming</span>
                  </>
                ) : (
                  <>
                    <RiCloseLine className={styles.checkIcon} />
                    <span>Rejected</span>
                  </>
                )}
              </div>
            </div>
            <div className={styles.actions}>
              <div className={styles.expandButton}>
                <Chevron className={cn(styles.chevron, isExpanded && styles.chevronExpanded)} />
              </div>
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
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Output-denied card
  if (isOutputDenied) {
    return (
      <div className={cn(styles.container, className)}>
        <div className={cn(styles.card, styles.cardDenied)} key={key}>
          <button
            className={styles.header}
            onClick={() => toggleExpanded(key)}
            aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
            aria-expanded={isExpanded}
            type="button"
          >
            <div className={styles.iconWrapper}>
              <Icon />
            </div>
            <div className={styles.content}>
              <div className={styles.toolName}>{tool.name}</div>
              <div className={cn(styles.status, styles.statusDenied)}>
                <RiCloseLine className={styles.checkIcon} />
                <span>Denied</span>
              </div>
            </div>
            <div className={styles.actions}>
              <div className={styles.expandButton}>
                <Chevron className={cn(styles.chevron, isExpanded && styles.chevronExpanded)} />
              </div>
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
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Default: running / complete / error
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
                  <RiCloseLine className={styles.checkIcon} />
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

            {part.state === 'output-error' && 'errorText' in part ? (
              <div className={styles.section}>
                <div className={styles.sectionTitle}>Error</div>
                <pre className={cn(styles.codeBlock, styles.errorText)}>
                  {(part as unknown as { errorText: string }).errorText}
                </pre>
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

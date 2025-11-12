import React, { useState } from 'react';
import { UIMessage, ToolInvocation } from '@ai-sdk/ui-utils';

import Link from 'next/link';
import { IconGear } from '../../icons/gear';
import HelpIconI from '@/components/icons/HelpIcon';
import { CheckIcon } from '@/components/icons';
import ChevronDownIcon from '@/components/icons/ChevronDownIcon';

import { useAITools } from '@/services/ai-agent/tools/tools';
import { AIAssistantTool } from '@/services/ai-agent/tools/ai-assistant-tool';

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
    <div className={`flex flex-col gap-2 py-2 ${className || ''}`}>
      {toolsStates.map(({ tool, state, invocation, key }) => {
        const Icon = tool.icon;
        const isExpanded = expandedToolKey === key;
        const isRunning = state !== 'result';

        return (
          <div
            className={`overflow-hidden rounded-lg border bg-white transition-all duration-200 ease-out hover:border-gray-300 hover:shadow-md ${isRunning ? 'border-blue-200 bg-blue-50/30' : 'border-gray-200'} ${isExpanded ? 'shadow-sm' : ''} `}
            key={key}
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-3 py-2.5">
              <div
                className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg transition-colors duration-200 ${
                  isRunning ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                } `}
              >
                {isRunning ? <IconGear /> : <Icon />}
              </div>

              <div className="min-w-0 flex-1">
                <div className="text-sm leading-tight font-semibold text-gray-900">{tool.name}</div>
                <div
                  className={`mt-0.5 flex items-center gap-1.5 text-xs font-medium ${isRunning ? 'text-blue-700' : 'text-emerald-700'} `}
                >
                  {isRunning ? (
                    <>
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
                      Running...
                    </>
                  ) : (
                    <>
                      <CheckIcon className="h-3.5 w-3.5 stroke-[3]" />
                      Complete
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  className="flex h-8 w-8 items-center justify-center rounded-md text-gray-500 transition-all duration-150 hover:bg-gray-100 hover:text-gray-700"
                  onClick={() => setExpandedToolKey(isExpanded ? null : key)}
                  aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
                  type="button"
                >
                  <ChevronDownIcon
                    className={`h-5 w-5 origin-center transform transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''} block`}
                  />
                </button>

                <Link
                  href={tool.docURL}
                  target="documentation"
                  aria-label="Tool information"
                  className="flex h-8 w-8 items-center justify-center rounded-md text-blue-600 transition-all duration-150 hover:bg-blue-50 hover:text-blue-700"
                  onClick={(e) => e.stopPropagation()}
                >
                  <HelpIconI className="h-4 w-4" />
                </Link>
              </div>
            </div>

            {/* Expandable Details */}
            {isExpanded && invocation && (
              <div className="border-t border-gray-200 bg-gray-50 px-3 py-3">
                {invocation.args && Object.keys(invocation.args).length > 0 && (
                  <div className="mb-3 last:mb-0">
                    <div className="mb-1.5 text-[10px] font-bold tracking-wider text-gray-500 uppercase">
                      Arguments
                    </div>
                    <pre className="overflow-x-auto rounded-md border border-gray-200 bg-white px-3 py-2.5 font-mono text-[11px] leading-relaxed text-gray-800">
                      {JSON.stringify(invocation.args, null, 2)}
                    </pre>
                  </div>
                )}

                {invocation.state === 'result' && invocation.result && (
                  <div className="mb-3 last:mb-0">
                    <div className="mb-1.5 text-[10px] font-bold tracking-wider text-gray-500 uppercase">
                      Result
                    </div>
                    <pre className="overflow-x-auto rounded-md border border-gray-200 bg-white px-3 py-2.5 font-mono text-[11px] leading-relaxed whitespace-pre text-gray-800">
                      {JSON.stringify(JSON.parse(invocation.result), null, 2)}
                    </pre>
                  </div>
                )}
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

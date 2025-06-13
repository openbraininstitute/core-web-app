import React from 'react';
import { serviceAiAgentGetTool, serviceAiAgentListTools } from '../api/tools';
import { AIAssistantTool } from './ai-assistant-tool/ai-assistant-tool';
import { useAccessToken } from '@/hooks/useAccessToken';
import { logError } from '@/util/logger';

let toolsListSingleton: Promise<AIAssistantTool[] | null> | null = null;

export const SELECTABLE_AI_TOOLS = ['literature-search-tool', 'web-search-tool'];

/**
 *
 * @returns A list of available AI tools.
 * Or `undefined` if the query is still pending.
 * Or `null` if an error occured.
 */
export function useAITools(): AIAssistantTool[] | undefined | null {
  const accessToken = useAccessToken();
  const [tools, setTools] = React.useState<AIAssistantTool[] | undefined | null>(undefined);
  React.useEffect(() => {
    if (!accessToken) return;

    if (!toolsListSingleton) toolsListSingleton = loadTools(accessToken);
    toolsListSingleton?.then(setTools).catch((ex) => {
      logError('Unable to get list of AI Agent tools:', ex);
      setTools(null);
    });
  }, [accessToken]);
  return tools;
}

async function loadTools(accessToken: string): Promise<AIAssistantTool[] | null> {
  const list = (await serviceAiAgentListTools(accessToken)).filter(({ name }) =>
    SELECTABLE_AI_TOOLS.includes(name)
  );
  const tools: AIAssistantTool[] = [];
  for (const { name: id } of list) {
    const tool = await serviceAiAgentGetTool(accessToken, id);
    tools.push(new AIAssistantTool(tool.name, tool.name_frontend, tool.description_frontend));
  }
  return tools.sort(sortToolsByName);
}

function sortToolsByName(a: AIAssistantTool, b: AIAssistantTool): number {
  if (a.name > b.name) return +1;
  if (a.name < b.name) return -1;
  return 0;
}

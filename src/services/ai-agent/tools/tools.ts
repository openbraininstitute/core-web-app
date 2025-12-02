import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { serviceAiAgentGetTool, serviceAiAgentListTools } from '../api/tools';
import { AIAssistantTool } from './ai-assistant-tool/ai-assistant-tool';

import { useAccessToken } from '@/hooks/useAccessToken';
import { keyBuilderAI } from '@/ui/use-query-keys/ai-assistant';

/**
 *
 * @returns A list of available AI tools without description.
 * Or `undefined` if the query is still pending.
 * Or `null` if an error occured.
 */
export function useAITools(): AIAssistantTool[] | undefined | null {
  const queryClient = useQueryClient();
  const accessToken = useAccessToken();
  const toolsLoader = React.useCallback(() => loadTools(accessToken), [accessToken]);
  const { data, isError, isLoading } = useQuery({
    queryKey: keyBuilderAI.tools(),
    queryFn: toolsLoader,
    staleTime: 180000,
  });
  React.useEffect(() => {
    queryClient.invalidateQueries({ queryKey: keyBuilderAI.tools() });
  }, [accessToken, queryClient]);
  if (isLoading) return undefined;

  return isError ? null : data;
}

export function useAITool(toolId: string) {
  const queryClient = useQueryClient();
  const accessToken = useAccessToken();
  const toolLoader = React.useCallback(() => loadTool(accessToken, toolId), [accessToken, toolId]);
  const { data, isError, isLoading } = useQuery({
    queryKey: keyBuilderAI.tool(toolId),
    queryFn: toolLoader,
    staleTime: 600000,
  });
  React.useEffect(() => {
    queryClient.invalidateQueries({ queryKey: keyBuilderAI.tool(toolId) });
  }, [accessToken, queryClient, toolId]);
  if (isLoading) return undefined;

  return isError ? null : data;
}

async function loadTools(accessToken: string | undefined): Promise<AIAssistantTool[]> {
  if (!accessToken) return [];

  const list = await serviceAiAgentListTools(accessToken);
  const tools: AIAssistantTool[] = list.map(
    (summary) => new AIAssistantTool(summary.name, summary.name_frontend, '')
  );
  return tools.sort(sortToolsByName);
}

function sortToolsByName(tool1: AIAssistantTool, tool2: AIAssistantTool): number {
  const name1 = tool1.name.trim().toLowerCase();
  const name2 = tool2.name.trim().toLowerCase();
  if (name1 < name2) return +1;
  if (name1 > name2) return -1;
  return 0;
}

async function loadTool(accessToken: string | undefined, toolId: string): Promise<AIAssistantTool> {
  if (!accessToken) {
    return new AIAssistantTool(toolId, '', '');
  }
  const tool = await serviceAiAgentGetTool(accessToken, toolId);
  return new AIAssistantTool(tool.name, tool.name_frontend, tool.description_frontend);
}

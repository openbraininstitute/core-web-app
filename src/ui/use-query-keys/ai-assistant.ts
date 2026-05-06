const prefix = 'ai-assistant';

export const keyBuilderAI = {
  tools: () => [prefix, 'tools'],
  tool: (toolId: string) => [prefix, 'tool', toolId],
  history: (virtualLabId: string | null, projectId: string | null) => [
    prefix,
    'history',
    virtualLabId,
    projectId,
  ],
  messages: (threadId: string, virtualLabId: string | null, projectId: string | null) => [
    prefix,
    'messages',
    threadId,
    virtualLabId,
    projectId,
  ],
  search: (query: string, virtualLabId: string | null, projectId: string | null) => [
    prefix,
    'search',
    query,
    virtualLabId,
    projectId,
  ],
};

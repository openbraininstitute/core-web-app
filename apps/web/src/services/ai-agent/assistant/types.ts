export interface AssistantContext {
  accessToken: string;
  virtualLabId: string | null;
  projectId: string | null;
}

export type AiAssistantHistory = AiAssistantHistoryItem[];

export interface AiAssistantHistoryItem {
  id: string;
  title: string;
  date: Date;
}

export type AssistantError = { message: string; reason: unknown } | null;

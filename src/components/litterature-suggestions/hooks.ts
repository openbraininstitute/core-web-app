'use client';

import React from 'react';
import { useSession } from 'next-auth/react';
import { useChat } from '@ai-sdk/react';

import { userJourneyTracker } from '../explore-section/Literature/user-journey';
import {
  ExploreAiSuggestionsQuery,
  ExploreAiThreadCreateQuery,
  ExploreAiThreadDeleteQuery,
  isExploreAiSuggestionsResponse,
  isExploreAiThreadCreateResponse,
  isExploreAiThreadDeleteResponse,
} from '@/app/api/explore-ai/types';
import { useGenericEventListener } from '@/util/generic-event';
import { createHeaders } from '@/util/utils';
import { logError } from '@/util/logger';

const AGENT_URL = process.env.NEXT_PUBLIC_AI_AGENT_URL;

export function useThreadId() {
  const refCurrentThreadId = React.useRef<string | null>(null);
  const [threadId, setThreadId] = React.useState<string | undefined>(undefined);
  const session = useSession();
  const accessToken = session.data?.accessToken;
  const user = session.data?.user.username;
  React.useEffect(() => {
    if (!accessToken) return;

    const query: ExploreAiThreadCreateQuery = {
      type: 'thread-create',
      title: `${user} ${new Date().toISOString()}`,
    };
    fetchJSON(accessToken, query, isExploreAiThreadCreateResponse).then((data) => {
      setThreadId(data.thread_id);
      refCurrentThreadId.current = data.thread_id;
    });
    return () => {
      const currentThreadId = refCurrentThreadId.current;
      if (!currentThreadId) return;

      const deletionQuery: ExploreAiThreadDeleteQuery = {
        type: 'thread-delete',
        threadId: currentThreadId,
      };
      refCurrentThreadId.current = null;
      fetchJSON(accessToken, deletionQuery, isExploreAiThreadDeleteResponse);
    };
  }, [accessToken, user]);
  return threadId;
}

/**
 * @returns
 * - `null`: an error occured
 * - `undefined`: a query is pending
 * - `ScientificArticle[]`: list of relvant articles
 */
export function useLitteratureCrawler(threadId: string | undefined) {
  const session = useSession();
  // const [articles, setArticles] = React.useState<ScientificArticle[]>([]);
  const chat = useChat({
    api: `${AGENT_URL}/qa/chat_streamed/${threadId}`,
    id: threadId,
    headers: {
      Authorization: `Bearer ${session.data?.accessToken}`,
    },
    experimental_prepareRequestBody: ({ messages }) => {
      const lastMessage = messages[messages.length - 1];
      // const selectedTools = Object.keys(checkedTools).filter(
      //   (key) => key !== "allchecked" && checkedTools[key] === true,
      // );
      return { content: lastMessage.content }; // , tool_selection: selectedTools };
    },
  });
  return {
    messages: chat.messages,
    append: chat.append,
    status: chat.status,
    error: chat.error,
  };
}

export function usePromptSuggestions(): [suggestions: string[], clear: () => void] {
  const accessToken = useAccessToken();
  const [suggestions, setSuggestions] = React.useState<string[]>([]);
  const fetchSuggestions = React.useCallback(() => {
    const action = async () => {
      if (!accessToken) return;

      const history = await userJourneyTracker.getLastTuples();
      const query: ExploreAiSuggestionsQuery = {
        type: 'suggestions',
        history,
      };
      try {
        const data = await fetchJSON(accessToken, query, isExploreAiSuggestionsResponse);
        setSuggestions(data.suggestions.map((item) => item.question));
      } catch {
        setSuggestions([]);
      }
    };
    action();
  }, [accessToken]);
  React.useEffect(fetchSuggestions, [fetchSuggestions]);
  useGenericEventListener(userJourneyTracker.eventChange, fetchSuggestions);
  return [suggestions, () => setSuggestions([])];
}

export async function fetchJSON<T>(
  accessToken: string,
  query: unknown,
  typeGuard: (data: unknown) => data is T
): Promise<T> {
  try {
    const resp = await fetch(`${AGENT_URL}/threads`, {
      method: 'POST',
      headers: createHeaders(accessToken ?? 'token-is-missing', {
        'Content-Type': 'application/json',
      }),
      body: JSON.stringify(query),
    });
    const data = await resp.json();
    if (!resp.ok) {
      logError(`Error #${resp.status}`);
      logError('Query:', query);
      logError(`Output:`, data);
      throw new Error(`Query failed with error code #${resp.status}!`);
    }
    if (!typeGuard(data)) {
      throw new Error('Unexpected return type!');
    }
    return data;
  } catch (ex) {
    throw new Error(`Query failed!\n${ex}`);
  }
}

function useAccessToken(): string | undefined {
  const session = useSession();
  const accessToken = session.data?.accessToken;
  return accessToken;
}

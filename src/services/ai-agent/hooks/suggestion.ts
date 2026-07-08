'use client';

import React from 'react';

import { useSnapshot } from '@/features/ai-assistant/chat/suggested-questions/snapshot';
import { useAccessToken } from '@/hooks/useAccessToken';
import { useParamProjectId, useParamVirtualLabId } from '@/util/params';

import { serviceAiAgentSuggestionFromUserJourney } from '../api/suggestion';

const DEBOUNCE_MS = 1200;

const DEFAULT_SUGGESTIONS_POOL = [
  'Find neurons from the thalamus and compute their soma diameters',
  'Find a microcircuit from rat and compute connection probabilities',
  'Plot a sample electrical cell recording from my project',
  'Search for papers about microcircuit simulations',
  'Show me available morphologies for a brain region',
  'Run a single-neuron simulation with default parameters',
  'Browse the workflow categories and start a new build',
  'Visualize recent workflow runs and their statuses',
  'List available notebook templates in this workspace',
  'Find neurons by morphology type in a specific region',
  'Show me the brain region hierarchy I can explore',
  'Compare neuron densities across thalamic subregions',
  'Generate a quick-start plan for running a simulation',
  'Summarize the available e-models for a brain region',
];

function pickRandomDefaults(count: number): string[] {
  const shuffled = [...DEFAULT_SUGGESTIONS_POOL].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export function useServiceAiAgentSuggestionFromUserJourney(
  threadId: string,
  status?: 'submitted' | 'streaming' | 'ready' | 'error',
  isActiveConversation?: boolean
): [
  suggestions: string[],
  clearSuggestions: () => void,
  isRefreshing: boolean,
  refetch: () => void,
] {
  const snapshot = useSnapshot();
  const virtualLabId = useParamVirtualLabId();
  const projectId = useParamProjectId();
  const accessToken = useAccessToken();

  const [suggestions, setSuggestions] = React.useState<string[]>([]);
  const [isRefreshing, setIsRefreshing] = React.useState(true);
  const [fetchTrigger, setFetchTrigger] = React.useState(0);

  const requestIdRef = React.useRef(0);
  const debounceRef = React.useRef<ReturnType<typeof setTimeout>>(undefined);
  const skipDebounceRef = React.useRef(false);

  // Populate random defaults only on client to avoid hydration mismatch
  React.useEffect(() => {
    setSuggestions((prev) => (prev.length === 0 ? pickRandomDefaults(3) : prev));
  }, []);

  React.useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const prevFrontendUrlRef = React.useRef(snapshot.frontendUrl);

  React.useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    // While the AI is working, show defaults instead of empty
    if (status === 'submitted' || status === 'streaming') {
      setSuggestions((prev) => (prev.length > 0 ? prev : pickRandomDefaults(3)));
      setIsRefreshing(false);
      prevFrontendUrlRef.current = snapshot.frontendUrl;
      return;
    }

    if (status !== 'ready' || !accessToken || !virtualLabId || !projectId || !threadId) return;

    // In active conversation, ignore URL changes — only react to other dep changes
    const urlChanged = snapshot.frontendUrl !== prevFrontendUrlRef.current;
    prevFrontendUrlRef.current = snapshot.frontendUrl;

    if (isActiveConversation && urlChanged) {
      return;
    }

    const doFetch = () => {
      const currentRequestId = ++requestIdRef.current;
      setIsRefreshing(true);

      serviceAiAgentSuggestionFromUserJourney(accessToken, {
        threadId,
        virtualLabId,
        projectId,
        frontendUrl: snapshot.frontendUrl,
      })
        .then((data) => {
          if (currentRequestId === requestIdRef.current) setSuggestions(data);
        })
        .catch(() => {
          // Keep existing suggestions on error
        })
        .finally(() => {
          if (currentRequestId === requestIdRef.current) setIsRefreshing(false);
        });
    };

    // Only debounce when we already have real (non-default) suggestions from the API.
    // `suggestions` is intentionally read from closure (not in deps) to avoid re-triggering the effect.
    const hasRealSuggestions =
      suggestions.length > 0 && !DEFAULT_SUGGESTIONS_POOL.includes(suggestions[0]);

    if (isActiveConversation || skipDebounceRef.current || !hasRealSuggestions) {
      skipDebounceRef.current = false;
      doFetch();
    } else {
      debounceRef.current = setTimeout(doFetch, DEBOUNCE_MS);
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshot.frontendUrl, threadId, accessToken, projectId, virtualLabId, status, fetchTrigger]);

  const clearSuggestions = React.useCallback(() => setSuggestions([]), []);
  const refetch = React.useCallback(() => {
    setSuggestions(pickRandomDefaults(3));
    skipDebounceRef.current = true;
    setFetchTrigger((n) => n + 1);
  }, []);

  return [suggestions, clearSuggestions, isRefreshing, refetch];
}

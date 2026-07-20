import { useQuery } from '@tanstack/react-query';

import { useAccessToken } from '@/hooks/useAccessToken';
import { serviceAiAgentStorageGetFileContent } from '@/services/ai-agent/api/storage';

export function usePlotFile(fileIdentifier: string) {
  const accessToken = useAccessToken() ?? 'NO-TOKEN';
  const { data, error, isError, isSuccess, isLoading } = useQuery({
    queryKey: ['storage', fileIdentifier],
    queryFn: async () => {
      try {
        const output = await serviceAiAgentStorageGetFileContent({
          accessToken,
          fileIdentifier,
        });
        return output;
      } catch (ex) {
        const message = ex instanceof Error ? ex.message : `${ex}`;
        throw new Error(`Unable to retrieve file "${fileIdentifier}": ${message}`);
      }
    },
    staleTime: Infinity,
    // Prevent refetch on remount — if Streamdown remounts a node, the cached data
    // (or in-flight query) is reused. This avoids the "stuck loading" state where
    // the query subscription gets interrupted mid-flight and restarts in a stale state.
    refetchOnMount: false,
  });

  return {
    data,
    error,
    isError,
    isSuccess,
    isLoading,
  };
}

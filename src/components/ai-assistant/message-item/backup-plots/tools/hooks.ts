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
    retry: 1,
    retryDelay: 500,
  });

  return {
    data,
    error,
    isError,
    isSuccess,
    isLoading,
  };
}

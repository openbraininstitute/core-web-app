'use client';

import { CloseOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { Switch } from '@/components/common/Switch/Switch';
import { useAccessToken } from '@/hooks/useAccessToken';
import {
  serviceAiAgentGetSettings,
  serviceAiAgentPatchSettings,
} from '@/services/ai-agent/api/settings';
import { keyBuilderAI } from '@/ui/use-query-keys/ai-assistant';
import { classNames } from '@/util/utils';

import styles from './settings.module.css';

export interface SettingsProps {
  className?: string;
  onBack(): void;
}

export default function Settings({ className, onBack }: SettingsProps) {
  const accessToken = useAccessToken() ?? '';
  const queryClient = useQueryClient();
  const queryKey = keyBuilderAI.settings();

  const { data, isLoading, isError } = useQuery({
    queryKey,
    queryFn: () => serviceAiAgentGetSettings(accessToken),
    enabled: Boolean(accessToken),
  });

  const mutation = useMutation({
    mutationFn: (requireApprovalForCodeExecution: boolean) =>
      serviceAiAgentPatchSettings({
        accessToken,
        requireApprovalForCodeExecution,
      }),
    onMutate: async (nextValue) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<{
        requireApprovalForCodeExecution: boolean;
      }>(queryKey);
      queryClient.setQueryData(queryKey, {
        requireApprovalForCodeExecution: nextValue,
      });
      return { previous };
    },
    onError: (_err, _next, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const requireApproval = data?.requireApprovalForCodeExecution ?? true;

  return (
    <div className={classNames(className, styles.settings)}>
      <div className={styles.header}>
        <span className={styles.headerTitle}>Settings</span>
        <button
          type="button"
          className={styles.closeBtn}
          onClick={onBack}
          aria-label="Close settings"
          title="Close settings"
        >
          <CloseOutlined />
        </button>
      </div>

      <div className={styles.content}>
        {isLoading && <p className={styles.status}>Loading settings…</p>}
        {isError && <p className={styles.statusError}>Could not load settings. Try again later.</p>}
        {!isLoading && !isError && (
          <div className={styles.row}>
            <div className={styles.rowText}>
              <div className={styles.rowTitle}>Require approval for code execution</div>
              <p className={styles.rowDescription}>
                When enabled, sandbox tools (Python, shell, kill sandbox) ask for your approval
                before running.
              </p>
            </div>
            <Switch
              value={requireApproval}
              onChange={(value) => mutation.mutate(value)}
              disabled={mutation.isPending}
            />
          </div>
        )}
      </div>
    </div>
  );
}

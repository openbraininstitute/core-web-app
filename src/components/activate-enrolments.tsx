'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

import { authFetch } from '@/auth-fetch';
import { useConfig } from '@/config';
import { keyBuilder, prefix } from '@/ui/use-query-keys/workspace';

interface ActivateEnrolmentResult {
  enrolment_id: string;
  activated: boolean;
  project_id: string;
  error?: string;
}

interface ActivateEnrolmentsResponse {
  results: ActivateEnrolmentResult[];
}

export function ActivateEnrolmentsOnLoad() {
  const config = useConfig();
  const queryClient = useQueryClient();

  const called = useRef(false);

  useEffect(() => {
    if (called.current) return;
    called.current = true;

    const activate = async () => {
      try {
        const response = await authFetch(
          `${config.VIRTUAL_LAB_API_URL}/courses/activate-enrolments`,
          {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
          }
        );

        const data: ActivateEnrolmentsResponse = await response.json();

        if (data.results?.some((r) => r.activated)) {
          queryClient.invalidateQueries({ queryKey: keyBuilder.membership() });
          queryClient.invalidateQueries({
            queryKey: [`${prefix}/list-filtered-virtual-labs`],
          });
          queryClient.invalidateQueries({
            queryKey: [`${prefix}/projects-list`],
          });
        }
      } catch (error) {
        // biome-ignore lint/suspicious/noConsole: intentional error logging
        console.error('Failed to activate enrolments', error);
      }
    };

    activate();
  }, [config.VIRTUAL_LAB_API_URL, queryClient]);

  return null;
}

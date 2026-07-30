'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

import { getVirtualLab } from '@/api/virtual-lab-svc/queries/virtual-lab';
import { authFetch } from '@/auth-fetch';
import { useConfig } from '@/config';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { keyBuilder, prefix } from '@/ui/use-query-keys/workspace';

export function ActivateEnrolmentsOnLoad() {
  const config = useConfig();
  const queryClient = useQueryClient();
  const { virtualLabId } = useWorkspace();
  const called = useRef(false);

  const { data: virtualLab } = useQuery({
    queryKey: keyBuilder.getOneLab({ virtualLabId }),
    queryFn: () => getVirtualLab({ id: virtualLabId }),
    enabled: !!virtualLabId,
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: Number.POSITIVE_INFINITY,
  });

  const courseId = virtualLab?.course?.id;

  useEffect(() => {
    if (!courseId || called.current) return;
    called.current = true;

    authFetch(`${config.VIRTUAL_LAB_API_URL}/courses/${courseId}/enrolment/activate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
    })
      .then(() => {
        queryClient.invalidateQueries({ queryKey: keyBuilder.membership() });
        queryClient.invalidateQueries({ queryKey: [`${prefix}/list-filtered-virtual-labs`] });
        queryClient.invalidateQueries({ queryKey: [`${prefix}/projects-list`] });
      })
      .catch(() => {
        // biome-ignore lint/suspicious/noConsole: intentional error logging
        console.error('Failed to activate enrolment');
      });
  }, [courseId, config.VIRTUAL_LAB_API_URL, queryClient]);

  return null;
}

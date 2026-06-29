'use client';

import { useEffect } from 'react';

import { authFetch } from '@/auth-fetch';
import { useConfig } from '@/config';

export function ActivateEnrolmentsOnLoad() {
  const config = useConfig();

  useEffect(() => {
    const activate = async () => {
      try {
        await authFetch(`${config.VIRTUAL_LAB_API_URL}/courses/activate-enrolments`, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
          },
        });
      } catch (error) {
        console.error('Failed to activate enrolments', error);
      }
    };

    activate();
  }, [config.VIRTUAL_LAB_API_URL]);

  return null;
}

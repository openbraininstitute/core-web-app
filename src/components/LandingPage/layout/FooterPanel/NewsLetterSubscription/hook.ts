import React, { useCallback } from 'react';

export function useNewsLetterSubscription() {
  const [state, setState] = React.useState<'input' | 'done'>('input');
  const subscribe = useCallback((_email: string) => {
    // @TODO: Connect to MailChimp service
    setState('done');
  }, []);
  return { state, subscribe };
}

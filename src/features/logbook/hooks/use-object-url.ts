import { isNil } from 'es-toolkit';
import { useEffect, useState } from 'react';

/** A URL for a Blob, revoked when the Blob changes or the component goes; `type` overrides the Blob's. */
export function useObjectUrl(blob: Blob | null | undefined, type?: string): string | null {
  const [url, setUrl] = useState<string | null>(null);
  // An effect, not a memo: StrictMode replays effects, and a memoised URL would be revoked in use.
  useEffect(() => {
    if (isNil(blob)) {
      setUrl(null);
      return;
    }
    const next = URL.createObjectURL(isNil(type) ? blob : new Blob([blob], { type }));
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [blob, type]);
  return url;
}

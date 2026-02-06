import delay from 'es-toolkit/compat/delay';
import { useCallback, useState } from 'react';

type CopiedValue = string | null;
type CopyFn = (text: string) => Promise<boolean>;
type ResetFn = () => void;

export function useCopyToClipboard(callbacks?: {
  onSuccess?: () => void;
  onError?: () => void;
}): [CopiedValue, CopyFn, ResetFn, boolean] {
  const [copiedText, setCopiedText] = useState<CopiedValue>(null);
  const [copying, setCopying] = useState(false);

  const copy: CopyFn = useCallback(
    async (text) => {
      if (!navigator.clipboard) {
        return false;
      }

      setCopying(true);
      try {
        await navigator.clipboard.writeText(text);
        setCopiedText(text);
        delay(() => setCopying(false), 2000);
        callbacks?.onSuccess?.();
        return true;
      } catch {
        setCopiedText(null);
        setCopying(false);
        callbacks?.onError?.();
        return false;
      }
    },
    [callbacks]
  );

  const reset = () => {
    setCopiedText(null);
  };

  return [copiedText, copy, reset, copying];
}

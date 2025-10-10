import { useCallback, useState } from 'react';
import delay from 'es-toolkit/compat/delay';

type CopiedValue = string | null;
type CopyFn = (text: string) => Promise<boolean>;
type ResetFn = () => void;

export function useCopyToClipboard(): [CopiedValue, CopyFn, ResetFn, boolean] {
  const [copiedText, setCopiedText] = useState<CopiedValue>(null);
  const [copying, setCopying] = useState(false);
  const copy: CopyFn = useCallback(async (text) => {
    if (!navigator.clipboard) {
      return false;
    }

    setCopying(true);
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(text);
      delay(() => setCopying(false), 2000);
      return true;
    } catch (error) {
      setCopiedText(null);
      setCopying(false);
      return false;
    }
  }, []);

  const reset = () => {
    setCopiedText(null);
  };

  return [copiedText, copy, reset, copying];
}

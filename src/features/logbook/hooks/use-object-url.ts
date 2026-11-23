import { isNil } from 'es-toolkit';
import { useEffect, useState } from 'react';

const SVG = 'image/svg+xml';

export function useObjectUrl(blob: Blob | null | undefined, type?: string): string | null {
  const [url, setUrl] = useState<string | null>(null);
  // An effect, not a memo: StrictMode replays effects, and a memoised URL would be revoked in use.
  useEffect(() => {
    if (isNil(blob)) {
      setUrl(null);
      return;
    }
    const bytes = isNil(type) ? blob : new Blob([blob], { type });
    // An uploaded SVG may hold script: a blob: URL opened in a new tab runs it as this site,
    // a data: URL can't be opened as a page. Same picture in an <img>.
    if (bytes.type === SVG) {
      const reader = new FileReader();
      reader.onload = () => setUrl(typeof reader.result === 'string' ? reader.result : null);
      reader.readAsDataURL(bytes);
      return () => reader.abort();
    }
    const next = URL.createObjectURL(bytes);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [blob, type]);
  return url;
}

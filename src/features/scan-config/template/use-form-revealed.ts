import { useEffect, useRef, useState } from 'react';

/** Whether a block has been picked yet; kept above the layouts, which remount as they are switched. */
export function useFormRevealed(selectedRootElement: string, selectedEntry: string) {
  const [revealed, setRevealed] = useState(false);
  const selection = `${selectedRootElement}/${selectedEntry}`;
  const lastSelection = useRef(selection);
  useEffect(() => {
    if (lastSelection.current === selection) return;
    lastSelection.current = selection;
    setRevealed(true);
  }, [selection]);
  return [revealed, setRevealed] as const;
}

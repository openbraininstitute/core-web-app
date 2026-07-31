import { useRef } from 'react';

/**
 * A `datarevision` for a Plotly plot: a number that changes whenever any of its inputs does.
 *
 * `layout.datarevision` is the only thing `Plotly.react` consults about trace arrays — once it is
 * set, the arrays themselves are never compared, so a redraw happens if and only if the revision
 * changed with them. Handing it a counter bumped for some unrelated reason leaves every other
 * change waiting on that reason to occur: it is why switching pA/nA relabelled the axis but left
 * the trace it was labelling untouched.
 *
 * Pass everything the drawn plot is derived from — the traces themselves, plus any signal that it
 * should be laid out again.
 */
export function usePlotRevision(...inputs: unknown[]): number {
  const revision = useRef(0);
  const previous = useRef(inputs);

  if (inputs.some((input, index) => input !== previous.current[index])) {
    previous.current = inputs;
    revision.current += 1;
  }

  return revision.current;
}

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { runPython } from '@/features/learn/components/courses/ui/python';

/**
 * A stand-in for Pyodide: each line of a cell is printed, but `yield`, which gives the event loop a
 * turn, as a cell does while it waits on something.
 */
const py = {
  stdout: (_: string) => {},
  setStdout({ batched }: { batched: (s: string) => void }) {
    this.stdout = batched;
  },
  setStderr() {},
  loadPackage: async () => {},
  globals: { get: () => () => ({ destroy() {} }) },
  async runPythonAsync(code: string, options?: unknown) {
    if (!options) return; // the prelude
    for (const line of code.split('\n')) {
      if (line === 'yield') await new Promise((r) => setTimeout(r, 0));
      else this.stdout(line);
    }
  },
};

describe('runPython', () => {
  beforeEach(() => {
    window.loadPyodide = async () => py as never;
    // the script tag loads at once
    vi.spyOn(document.head, 'appendChild').mockImplementation((el) => {
      queueMicrotask(() => (el as HTMLScriptElement).onload?.(new Event('load')));
      return el;
    });
  });
  afterEach(() => vi.restoreAllMocks());

  it("keeps each cell's prints to itself when two are run at once", async () => {
    const [first, second] = await Promise.all([runPython('a1\nyield\na2'), runPython('b1')]);
    expect(first).toEqual({ out: 'a1\na2\n', error: null });
    expect(second).toEqual({ out: 'b1\n', error: null });
  });

  it("gives NumPy that can't be fetched back as the cell's error, and runs the next cell", async () => {
    const loadPackage = vi.spyOn(py, 'loadPackage').mockRejectedValueOnce(new Error('network'));
    expect(await runPython('import numpy as np\nnope')).toEqual({
      out: '',
      error: "Couldn't fetch NumPy — are you online?",
    });
    expect(loadPackage).toHaveBeenCalledWith('numpy');
    expect(await runPython('b1')).toEqual({ out: 'b1\n', error: null });
  });
});

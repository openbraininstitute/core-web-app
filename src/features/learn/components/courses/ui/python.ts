/**
 * Python in the browser, for the coding course's cells: Pyodide, fetched from
 * its CDN only the first time someone presses Run, and kept for the rest of
 * the visit. Each run gets a namespace of its own, so cells don't leak into
 * each other; what they print comes back as text — plots included, which
 * `matplotlib.pyplot` (a small stand-in, so a cell reads as it would in a real
 * notebook) prints as a marked line of JSON for the page to draw.
 */

/** The Pyodide release: Python 3.13, NumPy 2.2. */
const PYODIDE = 'https://cdn.jsdelivr.net/pyodide/v0.29.5/full/';

/**
 * Run once per Python: a stand-in `matplotlib.pyplot` — plot (dashed, with
 * "--"), labels, title, legend, show — that prints each figure on `show()` as `__plot__{json}`. The
 * course generator runs the cells with the same stand-in, so the printed
 * outputs shown before anyone presses Run are what Run gives.
 */
export const PRELUDE = `
import sys as _sys, types as _types, json as _json

class _Pyplot(_types.ModuleType):
    def __init__(self):
        super().__init__("matplotlib.pyplot")
        self._lines, self._labels = [], {}

    def figure(self, *args, **kwargs):
        pass

    def plot(self, x, y=None, *args, label=None, **kwargs):
        if y is None:
            x, y = list(range(len(x))), x
        dashed = any(isinstance(a, str) and "--" in a for a in args) or kwargs.get("linestyle") in ("--", "dashed")
        self._lines.append(([round(float(v), 3) for v in x], [round(float(v), 3) for v in y], label, dashed))

    def xlabel(self, text, **kwargs):
        self._labels["xlabel"] = str(text)

    def ylabel(self, text, **kwargs):
        self._labels["ylabel"] = str(text)

    def title(self, text, **kwargs):
        self._labels["title"] = str(text)

    def legend(self, *args, **kwargs):
        pass

    def show(self, *args, **kwargs):
        if not self._lines:
            return
        x, first = self._lines[0][0], self._lines[0][1]
        keep = list(range(len(x)))
        if len(x) > 1200:
            # thinned to each stretch's lowest and highest points, in order, so no spike is lost
            size, keep = -(-len(x) // 600), []
            for start in range(0, len(x), size):
                part = range(start, min(len(x), start + size))
                keep += sorted({min(part, key=first.__getitem__), max(part, key=first.__getitem__)})
        data = {"x": [x[i] for i in keep], "ys": [[line[1][i] for i in keep] for line in self._lines], **self._labels}
        if any(line[2] for line in self._lines):
            data["labels"] = [line[2] or "" for line in self._lines]
        if any(line[3] for line in self._lines):
            data["dashes"] = [line[3] for line in self._lines]
        print("__plot__" + _json.dumps(data))
        self._lines, self._labels = [], {}

_matplotlib = _types.ModuleType("matplotlib")
_matplotlib.pyplot = _Pyplot()
_sys.modules["matplotlib"] = _matplotlib
_sys.modules["matplotlib.pyplot"] = _matplotlib.pyplot
`;

interface PyProxy {
  destroy(): void;
}
interface Pyodide {
  runPythonAsync(code: string, options?: { globals?: PyProxy }): Promise<unknown>;
  loadPackage(names: string | string[]): Promise<void>;
  setStdout(options: { batched: (s: string) => void }): void;
  setStderr(options: { batched: (s: string) => void }): void;
  globals: { get(name: string): (...args: unknown[]) => PyProxy };
}
declare global {
  interface Window {
    loadPyodide?: (options: { indexURL: string }) => Promise<Pyodide>;
  }
}

let ready: Promise<Pyodide> | null = null;
let loaded = false;

/** Whether Python has been fetched already: the first Run waits for it. */
export const pythonLoaded = () => loaded;

function load(): Promise<Pyodide> {
  ready ??= new Promise<Pyodide>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `${PYODIDE}pyodide.js`;
    script.async = true;
    script.onload = () => {
      if (!window.loadPyodide) return reject(new Error("Python didn't start."));
      window
        .loadPyodide({ indexURL: PYODIDE })
        .then(async (py) => {
          await py.runPythonAsync(PRELUDE);
          loaded = true;
          resolve(py);
        })
        .catch(reject);
    };
    script.onerror = () => reject(new Error("Couldn't fetch Python — are you online?"));
    document.head.appendChild(script);
  }).catch((e: unknown) => {
    // let a later Run try again
    ready = null;
    throw e;
  });
  return ready;
}

/** The traceback, from the cell's own first frame: Pyodide's own machinery cut out. */
function cleanError(message: string) {
  const lines = message.split('\n');
  const start = lines.findIndex((l) => l.includes('"<exec>"'));
  if (start < 0)
    return lines
      .filter((l) => l.trim())
      .slice(-1)
      .join('\n');
  return ['Traceback (most recent call last):', ...lines.slice(start)].join('\n').trim();
}

/** Run `code` in a fresh namespace; what it printed, and the traceback if it failed. */
export async function runPython(code: string): Promise<{ out: string; error: string | null }> {
  let py: Pyodide;
  try {
    py = await load();
  } catch (e) {
    return { out: '', error: e instanceof Error ? e.message : String(e) };
  }
  if (/^\s*(import|from)\s+numpy\b/m.test(code)) await py.loadPackage('numpy');
  let out = '';
  py.setStdout({ batched: (s) => (out += `${s}\n`) });
  py.setStderr({ batched: (s) => (out += `${s}\n`) });
  const scope = py.globals.get('dict')();
  try {
    await py.runPythonAsync(code, { globals: scope });
    return { out, error: null };
  } catch (e) {
    return { out, error: cleanError(e instanceof Error ? e.message : String(e)) };
  } finally {
    scope.destroy();
  }
}

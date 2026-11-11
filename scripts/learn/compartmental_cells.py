"""Runs the NEURON cells of the course "A basic introduction to compartmental modelling", in order, in one session, and
writes each one's code and what it printed (its plots as __plot__ lines) to the course figure's cells.ts.

Needs NEURON (pip install neuron). From the repository's root:

    python scripts/learn/compartmental_cells.py

Then format the file it writes: node_modules/.bin/biome format --write <that file>.
"""

import ctypes
import json
import math
import os
import sys
import tempfile
import types
from pathlib import Path

import neuron

OUT = (
    Path(__file__).resolve().parents[2]
    / "src/features/learn/components/courses/compartmental/cells.ts"
)

# (key, file name, the lines to light — what is new in it — code)
CELLS = [
    (
        "sections",
        "sections.py",
        [3, 4, 5, 9],
        '''from neuron import h

soma = h.Section(name="soma")
dend = h.Section(name="dend")
dend.connect(soma(1))                   # the dendrite's start, to the soma's end

soma.L = soma.diam = 20                 # µm
dend.L, dend.diam = 600, 1              # µm
dend.nseg = 11                          # cut into 11 compartments

h.topology()
for seg in dend:
    print(f"{seg.x:.2f} of the way along: {seg.area():.0f} µm²")''',
    ),
    (
        "biophysics",
        "biophysics.py",
        [2, 3, 5, 6, 8],
        '''for sec in (soma, dend):
    sec.Ra = 100                        # Ω·cm: the cytoplasm's resistivity
    sec.cm = 1                          # µF/cm²: the membrane's capacitance

soma.insert("hh")                       # Hodgkin–Huxley sodium, potassium and leak
dend.insert("pas")                      # a passive leak, and nothing else
for seg in dend:
    seg.pas.g = 1e-4                    # S/cm²
    seg.pas.e = -65                     # mV, its reversal potential

print("soma's sodium:", soma(0.5).hh.gnabar, "S/cm²")
print("dendrite's leak:", dend(0.5).pas.g, "S/cm²")
print("axial resistance to the next compartment:", round(dend(0.5).ri(), 1), "MΩ")''',
    ),
    (
        "inject",
        "inject.py",
        [4, 5, 7, 8, 9, 11, 12],
        '''import matplotlib.pyplot as plt
h.load_file("stdrun.hoc")

stim = h.IClamp(soma(0.5))              # an electrode, in the soma
stim.delay, stim.dur, stim.amp = 2, 1, 0.5      # ms, ms, nA

t = h.Vector().record(h._ref_t)
v_soma = h.Vector().record(soma(0.5)._ref_v)
v_dend = h.Vector().record(dend(0.9)._ref_v)

h.finitialize(-65)                      # mV
h.continuerun(20)                       # ms, in steps of h.dt, 0.025 ms

plt.plot(t, v_soma, label="soma")
plt.plot(t, v_dend, label="dendrite, near its end")
plt.xlabel("time (ms)")
plt.ylabel("membrane potential (mV)")
plt.legend()
plt.show()''',
    ),
    (
        "gates",
        "gates.py",
        [1, 2, 3],
        '''m = h.Vector().record(soma(0.5).hh._ref_m)        # sodium's activation gate
h_gate = h.Vector().record(soma(0.5).hh._ref_h)   # sodium's inactivation gate
n = h.Vector().record(soma(0.5).hh._ref_n)        # potassium's gate

h.finitialize(-65)
h.continuerun(20)

plt.plot(t, m, label="m: sodium opening")
plt.plot(t, h_gate, label="h: sodium shutting")
plt.plot(t, n, label="n: potassium opening")
plt.xlabel("time (ms)")
plt.ylabel("how open, 0 to 1")
plt.legend()
plt.show()''',
    ),
    (
        "synapse",
        "synapse.py",
        [3, 4, 5, 6, 7, 8],
        '''stim.amp = 0                            # the electrode off

syn = h.ExpSyn(dend(0.9))               # a synapse, near the dendrite's end
syn.tau, syn.e = 2, 0                   # ms, its decay; mV, its reversal potential, as AMPA's
spikes = h.NetStim()                    # spikes from another neuron, stood in for
spikes.number, spikes.start = 1, 5      # one spike, at 5 ms
link = h.NetCon(spikes, syn)            # from the spikes to the synapse
link.weight[0] = 0.002                  # µS: its conductance at its peak

h.finitialize(-65)
h.continuerun(40)

plt.plot(t, v_dend, label="dendrite, at the synapse")
plt.plot(t, v_soma, label="soma")
plt.xlabel("time (ms)")
plt.ylabel("membrane potential (mV)")
plt.legend()
plt.show()''',
    ),
]

# At most this many points to a plotted line: plenty for a figure, and the file stays small.
MOST_POINTS = 400


class Pyplot(types.ModuleType):
    """matplotlib's pyplot, as far as the cells use it: on show(), each figure's lines printed as one __plot__ line."""

    def __init__(self):
        super().__init__("matplotlib.pyplot")
        self._clear()

    def _clear(self):
        self._lines, self._labels, self._xlabel, self._ylabel = [], [], None, None

    def plot(self, x, y, label=None, **_):
        self._lines.append((list(x), list(y)))
        self._labels.append(label)

    def xlabel(self, text):
        self._xlabel = text

    def ylabel(self, text):
        self._ylabel = text

    def legend(self, *_, **__):
        pass

    def show(self):
        x = self._lines[0][0]
        step = max(1, math.ceil(len(x) / MOST_POINTS))
        plot = {
            "x": [round(v, 3) for v in x[::step]],
            "ys": [[round(v, 3) for v in y[::step]] for _, y in self._lines],
        }
        if any(self._labels):
            plot["labels"] = [label or "" for label in self._labels]
        if self._xlabel:
            plot["xlabel"] = self._xlabel
        if self._ylabel:
            plot["ylabel"] = self._ylabel
        print("__plot__" + json.dumps(plot, ensure_ascii=False))
        self._clear()


def main():
    matplotlib = types.ModuleType("matplotlib")
    matplotlib.pyplot = Pyplot()
    sys.modules["matplotlib"] = matplotlib
    sys.modules["matplotlib.pyplot"] = matplotlib.pyplot
    libc = ctypes.CDLL(None)
    namespace = {}
    entries = []
    for key, label, lit, code in CELLS:
        # what the cell prints, NEURON's own printing (through C's stdout) included
        sys.stdout.flush()
        libc.fflush(None)
        with tempfile.TemporaryFile() as caught:
            kept = os.dup(1)
            os.dup2(caught.fileno(), 1)
            try:
                exec(compile(code, label, "exec"), namespace)
            finally:
                sys.stdout.flush()
                libc.fflush(None)
                os.dup2(kept, 1)
                os.close(kept)
            caught.seek(0)
            output = caught.read().decode().strip("\n")
        entries.append((key, label, lit, code, output))
        print(f"ran {label}", file=sys.stderr)
    lines = [
        f"// Made by scripts/learn/compartmental_cells.py, with NEURON {neuron.__version__}: do not edit by hand.",
        "import type { Cell } from '../ui/Runnable';",
        "",
        f"export const NEURON_VERSION = {json.dumps(neuron.__version__)};",
        "",
        "export const CELLS = {",
    ]
    for key, label, lit, code, output in entries:
        side = "__plot__" in output
        lines += [
            f"  {key}: {{",
            f"    label: {json.dumps(label)},",
            f"    lit: {json.dumps(lit)},",
            f"    code: {json.dumps(code, ensure_ascii=False)},",
            f"    output: {json.dumps(output, ensure_ascii=False)},",
            f"    side: {'true' if side else 'false'},",
            "  },",
        ]
    lines += ["} satisfies Record<string, Cell>;", ""]
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text("\n".join(lines))
    print(f"wrote {OUT}", file=sys.stderr)


if __name__ == "__main__":
    main()

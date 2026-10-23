/**
 * Leaky integrate-and-fire soma — the simplest honest model of "collect input,
 * and spike if it adds up". Used for the introductory excitation/inhibition
 * figure, before Hodgkin–Huxley channels are introduced.
 *
 * Voltages in mV, times in ms.
 */

interface LifParams {
  /** Membrane time constant. */
  tauMs: number;
  vRest: number;
  vThresh: number;
  vReset: number;
  /** Refractory period after a spike. */
  refractoryMs: number;
}

export const DEFAULT_LIF: LifParams = {
  tauMs: 15,
  vRest: -70,
  vThresh: -50,
  vReset: -75,
  refractoryMs: 4,
};

export class Lif {
  v: number;
  t = 0;
  spikeCount = 0;
  /** Simulated times of recent spikes. */
  spikes: number[] = [];
  private lastSpike = -1e9;

  constructor(readonly p: LifParams = DEFAULT_LIF) {
    this.v = p.vRest;
  }

  reset() {
    this.v = this.p.vRest;
    this.t = 0;
    this.spikeCount = 0;
    this.spikes = [];
    this.lastSpike = -1e9;
  }

  /** Instantaneous post-synaptic potential, positive or negative (mV). */
  input(weightMv: number) {
    if (this.t - this.lastSpike < this.p.refractoryMs) return;
    this.v += weightMv;
  }

  /** Advance by `dtMs`. Returns true if the cell spiked during this step. */
  step(dtMs: number): boolean {
    const { tauMs, vRest, vThresh, vReset, refractoryMs } = this.p;
    this.t += dtMs;
    if (this.t - this.lastSpike < refractoryMs) {
      this.v = vReset;
      return false;
    }
    this.v += ((vRest - this.v) / tauMs) * dtMs;
    if (this.v >= vThresh) {
      this.v = vReset;
      this.lastSpike = this.t;
      this.spikeCount++;
      this.spikes.push(this.t);
      if (this.spikes.length > 200) this.spikes.shift();
      return true;
    }
    return false;
  }

  /** Firing rate from the most recent inter-spike interval, Hz. */
  rateHz() {
    const n = this.spikes.length;
    if (n < 2) return 0;
    const isi = this.spikes[n - 1] - this.spikes[n - 2];
    return isi > 0 ? 1000 / isi : 0;
  }
}

/**
 * Poisson event times in [0, dtMs) for a given rate, using the supplied RNG.
 * Returns the number of events in this step (rate is low enough that 0/1 is the
 * usual answer, but the loop keeps it correct for large steps).
 */
export function poissonEvents(rateHz: number, dtMs: number, rnd: () => number): number {
  const lambda = (rateHz * dtMs) / 1000;
  if (lambda <= 0) return 0;
  // Knuth's method; lambda stays small here.
  let n = 0;
  let p = Math.exp(-lambda);
  let cum = p;
  const u = rnd();
  while (u > cum && n < 20) {
    n++;
    p *= lambda / n;
    cum += p;
  }
  return n;
}

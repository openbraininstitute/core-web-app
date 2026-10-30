import { logWarn } from '@/utils/logger';
import { upperBound } from '@/utils/sorted';

import type { CircuitSpikes } from './types';

/** Simulated ms a second of the replay. */
export const DEFAULT_SPIKE_SPEED = 100;
/** The seconds a spike takes to fade to 1/e. */
export const DEFAULT_SPIKE_AFTERGLOW_IN_SECONDS = 0.25;
/** Whether spiking cells glow where the renderer can. */
export const DEFAULT_SPIKE_GLOW = true;

/** A spike older than this many fading times no longer glows. */
const GLOW_CUTOFF_IN_TAUS = 5;
/** The most wall-clock time a turn of the loop moves the replay on by, after a stall or a hidden tab. */
const MAX_FRAME_IN_MS = 250;
const NOMINAL_FRAME_IN_MS = 1000 / 60;

/**
 * A spike replay's clock, and each cell's glow at its moment: 1 as the cell fires, fading by e every `afterglow ×
 * speed` simulated ms. The fading time follows the speed so that a spike fades in the same wall-clock time at any speed.
 */
export class SpikeClock {
  private spikes: CircuitSpikes | null = null;
  private _glow = new Float32Array(0);
  private _lit: number[] = [];
  private _timeInMs = 0;
  private _playing = false;
  private _speed = DEFAULT_SPIKE_SPEED;
  private _afterglowInSeconds = DEFAULT_SPIKE_AFTERGLOW_IN_SECONDS;
  private lastTickInMs = 0;

  get glow(): Readonly<Float32Array> {
    return this._glow;
  }

  /** The cells that glow at the moment, an array of its own each time it changes. */
  get lit(): readonly number[] {
    return this._lit;
  }

  /** Whether there are spikes to replay. */
  get replaying(): boolean {
    return this.spikes !== null;
  }

  private get timeMinInMs(): number {
    return this.spikes?.timeMinInMs ?? 0;
  }

  private get timeMaxInMs(): number {
    return this.spikes?.timeMaxInMs ?? 0;
  }

  get timeInMs(): number {
    return this._timeInMs;
  }

  set timeInMs(timeInMs: number) {
    const clamped = clamp(timeInMs, this.timeMinInMs, this.timeMaxInMs);
    if (clamped === this._timeInMs) return;
    this._timeInMs = clamped;
    this.computeGlow();
  }

  get playing(): boolean {
    return this._playing;
  }

  /** Played at the end, the replay starts again from the beginning. */
  set playing(playing: boolean) {
    if (this._playing === playing) return;
    if (playing && this._timeInMs >= this.timeMaxInMs) {
      this._timeInMs = this.timeMinInMs;
      this.computeGlow();
    }
    this._playing = playing;
    this.lastTickInMs = now();
  }

  get speed(): number {
    return this._speed;
  }

  set speed(speed: number) {
    if (this._speed === speed) return;
    this._speed = speed;
    this.computeGlow();
  }

  get afterglowInSeconds(): number {
    return this._afterglowInSeconds;
  }

  set afterglowInSeconds(afterglowInSeconds: number) {
    if (this._afterglowInSeconds === afterglowInSeconds) return;
    this._afterglowInSeconds = afterglowInSeconds;
    this.computeGlow();
  }

  /** New spikes start from the beginning, paused. */
  setSpikes(spikes: CircuitSpikes | null): void {
    if (spikes) warnIfUnsorted(spikes.times);
    this.spikes = spikes;
    this._timeInMs = this.timeMinInMs;
    this._playing = false;
    this.computeGlow();
  }

  setCellCount(cellCount: number): void {
    if (this._glow.length === cellCount) return;
    this._glow = new Float32Array(cellCount);
    this._lit = [];
    this.computeGlow();
  }

  /**
   * Moves a playing replay on by the wall-clock time since the last call, but never by more than a glow lasts, so no
   * spike goes by unseen. True when that reached the end, which stops it.
   */
  advance(): boolean {
    const wallClock = now();
    const deltaInMs = Math.min(wallClock - this.lastTickInMs, MAX_FRAME_IN_MS);
    this.lastTickInMs = wallClock;
    if (!this._playing || deltaInMs <= 0) return false;
    const stepInMs = Math.min(
      (deltaInMs / 1000) * this._speed,
      Math.max(this.glowWindowInMs, (NOMINAL_FRAME_IN_MS / 1000) * this._speed)
    );
    const timeInMs = this._timeInMs + stepInMs;
    if (timeInMs >= this.timeMaxInMs) {
      this._timeInMs = this.timeMaxInMs;
      this._playing = false;
      this.computeGlow();
      return true;
    }
    this._timeInMs = timeInMs;
    this.computeGlow();
    return false;
  }

  private get tauInMs(): number {
    return Math.max(this._afterglowInSeconds * this._speed, Number.MIN_VALUE);
  }

  private get glowWindowInMs(): number {
    return GLOW_CUTOFF_IN_TAUS * this.tauInMs;
  }

  /** Each cell's brightest spike in the window before the moment, walked back from it. */
  private computeGlow(): void {
    const glow = this._glow;
    for (const cell of this._lit) glow[cell] = 0;
    const lit: number[] = [];
    this._lit = lit;
    const { spikes } = this;
    if (!spikes || glow.length === 0) return;
    const { cellIndices, times } = spikes;
    const tauInMs = this.tauInMs;
    const t = this._timeInMs;
    const oldest = t - this.glowWindowInMs;
    for (let i = upperBound(times, t) - 1; i >= 0; i--) {
      const spikeTime = times[i];
      if (spikeTime < oldest) break;
      const cellIndex = cellIndices[i];
      if (cellIndex >= glow.length) continue;
      const intensity = Math.exp((spikeTime - t) / tauInMs);
      if (intensity <= glow[cellIndex]) continue;
      if (glow[cellIndex] === 0) lit.push(cellIndex);
      glow[cellIndex] = intensity;
    }
  }
}

function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function warnIfUnsorted(times: Float32Array): void {
  for (let i = 1; i < times.length; i++) {
    if (times[i] >= times[i - 1]) continue;
    logWarn(
      `Spike times must be ascending, but times[${i}] (${times[i]}) is before times[${i - 1}] (${times[i - 1]}). Cells will light up at the wrong moments.`
    );
    return;
  }
}

function now(): number {
  return typeof performance === 'undefined' ? Date.now() : performance.now();
}

/**
 * What a frame costs the GPU. Timing `render()` on the CPU would measure only the commands' submission.
 *
 * Chrome and Edge on desktop have timer queries. Elsewhere a fence after the frame is polled: the time from the frame's
 * start until the GPU is done with it, which also counts the submission and the polling, so it errs on the slow side.
 */

/** How often a result is looked for, ms: it becomes available only between tasks. */
const POLL_MS = 2;
/** A result not in by then is given up on, ms: the context may have been lost. */
const GIVE_UP_MS = 1000;

export type TimerKind = 'timer-query' | 'fence';

interface TimerQueryExt {
  TIME_ELAPSED_EXT: number;
  GPU_DISJOINT_EXT: number;
}

export class GpuTimer {
  readonly kind: TimerKind;
  private ext: TimerQueryExt | null;
  private pending = false;
  private started = 0;
  private query: WebGLQuery | null = null;
  private disposed = false;

  constructor(
    private gl: WebGL2RenderingContext,
    private onResult: (ms: number) => void
  ) {
    this.ext = gl.getExtension('EXT_disjoint_timer_query_webgl2') as TimerQueryExt | null;
    this.kind = this.ext ? 'timer-query' : 'fence';
  }

  /** One frame is measured at a time. */
  get busy(): boolean {
    return this.pending;
  }

  /** Before the frame's first command. */
  begin(): void {
    this.pending = true;
    this.started = performance.now();
    if (!this.ext) return;
    this.query = this.gl.createQuery();
    if (this.query) this.gl.beginQuery(this.ext.TIME_ELAPSED_EXT, this.query);
  }

  /** After its last. */
  end(): void {
    const { gl, ext, query } = this;
    if (ext && query) {
      gl.endQuery(ext.TIME_ELAPSED_EXT);
      this.poll(
        () => {
          if (!gl.getQueryParameter(query, gl.QUERY_RESULT_AVAILABLE)) return null;
          const disjoint = gl.getParameter(ext.GPU_DISJOINT_EXT);
          const ns = gl.getQueryParameter(query, gl.QUERY_RESULT) as number;
          return disjoint ? Number.NaN : ns / 1e6;
        },
        () => gl.deleteQuery(query)
      );
      return;
    }
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    if (!sync) {
      this.pending = false;
      return;
    }
    this.poll(
      () =>
        gl.getSyncParameter(sync, gl.SYNC_STATUS) === gl.SIGNALED
          ? performance.now() - this.started
          : null,
      () => gl.deleteSync(sync)
    );
  }

  dispose(): void {
    this.disposed = true;
  }

  /**
   * `read` until it gives a result, NaN where the measurement is void, then `release` what was measured with; also
   * once given up on, or disposed of.
   */
  private poll(read: () => number | null, release: () => void): void {
    const tick = () => {
      const ms = this.disposed ? null : read();
      if (!this.disposed && ms === null && performance.now() - this.started < GIVE_UP_MS) {
        setTimeout(tick, POLL_MS);
        return;
      }
      release();
      this.pending = false;
      this.query = null;
      if (ms !== null && Number.isFinite(ms)) this.onResult(ms);
    };
    setTimeout(tick, POLL_MS);
  }
}

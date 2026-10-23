import { useRef } from 'react';

export interface SnapshotOptions {
  type?: 'image/png' | 'image/webp' | 'image/jpeg';
  quality?: number;
}

export interface CameraResetOptions {
  zoom?: number;
}

/** One handler at a time, the last to register; a dispatch with none rejects. */
export class ViewerSignal<Input = void, Output = void> {
  private handler: ((args: Input) => Output | Promise<Output>) | undefined;

  async dispatch(args: Input): Promise<Output> {
    if (!this.handler) throw new Error('Viewer signal: no handler registered yet.');
    return this.handler(args);
  }

  register(handler: (args: Input) => Output | Promise<Output>): () => void {
    this.handler = handler;
    return () => {
      if (this.handler === handler) this.handler = undefined;
    };
  }
}

/** What the page asks of the circuit viewer on show. */
export class CircuitViewerSignals {
  readonly cameraReset = new ViewerSignal<CameraResetOptions | undefined>();
  readonly snapshot = new ViewerSignal<SnapshotOptions | undefined, HTMLImageElement | null>();
  readonly nudgeMorphology = new ViewerSignal();
  readonly setZoom = new ViewerSignal<number>();
}

/** A bus that lasts as long as the component. */
export function useCircuitViewerSignals(): CircuitViewerSignals {
  const ref = useRef<CircuitViewerSignals | null>(null);
  if (!ref.current) ref.current = new CircuitViewerSignals();
  return ref.current;
}

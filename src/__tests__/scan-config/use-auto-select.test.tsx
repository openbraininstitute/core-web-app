import { act, renderHook } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';

import { useAutoSelectFileOnConfigChange } from '@/features/scan-config/components/shared/use-auto-select';
import {
  ActivityCustomFileRenderer,
  type TActivityCustomFile,
  type TActivityCustomFileRenderer,
} from '@/features/scan-config/types';

function file(
  id: string,
  renderer: TActivityCustomFileRenderer = ActivityCustomFileRenderer.Default
): TActivityCustomFile {
  return {
    id,
    entity: { id: `entity-${id}` },
    asset: { id, path: `${id}.h5` },
    renderer,
  } as unknown as TActivityCustomFile;
}

const logs = file('job-1:task-logs', ActivityCustomFileRenderer.TaskLogsViewer);
const spikes = file('spikes');
const config = file('config');

type THarnessProps = {
  configId: string;
  inputFiles: TActivityCustomFile[];
  outputFiles: TActivityCustomFile[];
  resultReady?: boolean;
  awaitingResult?: boolean;
  initialSelected?: TActivityCustomFile;
};

function useHarness({ initialSelected, ...props }: THarnessProps) {
  const [selectedFile, setSelectedFile] = useState(initialSelected);
  useAutoSelectFileOnConfigChange({ ...props, selectedFile, onSelect: setSelectedFile });
  return { selectedFile, setSelectedFile };
}

function running(resultReady: boolean | undefined): THarnessProps {
  return { configId: 'sim-1', inputFiles: [config], outputFiles: [logs], resultReady };
}

function done(resultReady: boolean | undefined): THarnessProps {
  // the file on show ranks first, as the simulation tab orders its outputs
  return { configId: 'sim-1', inputFiles: [config], outputFiles: [logs, spikes], resultReady };
}

describe('useAutoSelectFileOnConfigChange', () => {
  it('opens a running simulation on its log', () => {
    const { result } = renderHook(useHarness, { initialProps: running(false) });
    expect(result.current.selectedFile).toBe(logs);
  });

  it('switches from the log to the result once the run is done', () => {
    const { result, rerender } = renderHook(useHarness, { initialProps: running(false) });
    rerender({ ...running(false), awaitingResult: true });
    rerender(done(true));
    expect(result.current.selectedFile).toBe(spikes);
  });

  it('keeps a file the user picked while the run went on', () => {
    const { result, rerender } = renderHook(useHarness, { initialProps: running(false) });
    act(() => result.current.setSelectedFile(config));
    rerender(done(true));
    expect(result.current.selectedFile).toBe(config);
  });

  it('stays on the log while the result is not ready, as after an error', () => {
    const { result, rerender } = renderHook(useHarness, { initialProps: running(false) });
    rerender(done(false));
    expect(result.current.selectedFile).toBe(logs);
  });

  it('keeps the log the user opened on a finished run', () => {
    const { result, rerender } = renderHook(useHarness, {
      initialProps: { ...done(true), outputFiles: [spikes, logs] },
    });
    expect(result.current.selectedFile).toBe(spikes);
    act(() => result.current.setSelectedFile(logs));
    rerender(done(true));
    expect(result.current.selectedFile).toBe(logs);
  });

  it('keeps the log when the caller does not say when the result is ready', () => {
    const { result, rerender } = renderHook(useHarness, { initialProps: running(undefined) });
    rerender(done(undefined));
    expect(result.current.selectedFile).toBe(logs);
  });

  it('switches from a log the user returned to while the run went on', () => {
    const { result, rerender } = renderHook(useHarness, { initialProps: running(false) });
    act(() => result.current.setSelectedFile(config));
    act(() => result.current.setSelectedFile(logs));
    rerender({ ...running(false), awaitingResult: true });
    rerender(done(true));
    expect(result.current.selectedFile).toBe(spikes);
  });

  it('keeps a log carried over to another finished simulation', () => {
    const logs2 = file('job-2:task-logs', ActivityCustomFileRenderer.TaskLogsViewer);
    const { result, rerender } = renderHook(useHarness, {
      initialProps: { ...done(true), outputFiles: [spikes, logs] },
    });
    act(() => result.current.setSelectedFile(logs));
    rerender({ ...done(false), configId: 'sim-2', outputFiles: [logs2], awaitingResult: true });
    rerender({ ...done(true), configId: 'sim-2', outputFiles: [logs2, spikes] });
    expect(result.current.selectedFile).toBe(logs2);
  });

  it('switches from a log already on show when the simulation is first seen', () => {
    const initialProps: THarnessProps = { ...running(false), initialSelected: logs };
    const { result, rerender } = renderHook(useHarness, { initialProps });
    rerender({ ...running(false), awaitingResult: true });
    rerender(done(true));
    expect(result.current.selectedFile).toBe(spikes);
  });

  it('starts over for another simulation', () => {
    const { result, rerender } = renderHook(useHarness, { initialProps: running(false) });
    rerender({ ...done(true), configId: 'sim-2', outputFiles: [spikes, logs] });
    expect(result.current.selectedFile).toBe(spikes);
  });
});

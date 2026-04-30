export const LogStreamFileRenderer = {
  TaskConfiguration: 'task-configuration-viewer',
  TaskLogs: 'task-logs-viewer',
} as const;

export type TLogStreamFileRenderer =
  (typeof LogStreamFileRenderer)[keyof typeof LogStreamFileRenderer];

export type TBuildLogStreamFileDescriptor = {
  id: string;
  name: string;
  path: string;
  renderer: TLogStreamFileRenderer;
};

export function makeLogStreamFileDescriptors({
  configId,
  executionId,
}: {
  configId: string;
  executionId?: string | null;
}): {
  input: TBuildLogStreamFileDescriptor | null;
  output: TBuildLogStreamFileDescriptor | null;
  showOutput: boolean;
} {
  if (!executionId) {
    return {
      input: null,
      output: null,
      showOutput: false,
    };
  }

  return {
    input: {
      id: `${configId}:task-logs-configuration`,
      name: 'Task configuration',
      path: 'logs-configuration.config',
      renderer: LogStreamFileRenderer.TaskConfiguration,
    },
    output: {
      id: `${executionId}:task-logs`,
      name: 'Task logs',
      path: 'logs.log',
      renderer: LogStreamFileRenderer.TaskLogs,
    },
    showOutput: true,
  };
}

export function prependLogStreamFile<T>({ file, files }: { file: T | null; files: T[] }): T[] {
  return file ? [file, ...files] : files;
}

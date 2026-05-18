import { AssetContentType, AssetLabel, type IAsset } from '@/api/entitycore/types/shared/global'
import { ActivityCustomFileRenderer } from '@/features/scan-config/types'

import type { ITaskActivity } from '@/api/entitycore/types/entities/task-activity'
import type { ITaskConfig } from '@/api/entitycore/types/entities/task-config'
import type { TActivityCustomFile } from '@/features/scan-config/types'

export const LogStreamFileRenderer = {
  TaskConfiguration: 'task-configuration-viewer',
  TaskLogs: 'task-logs-viewer',
} as const

export type TLogStreamFileRenderer =
  (typeof LogStreamFileRenderer)[keyof typeof LogStreamFileRenderer]

export type TLogStreamFileDescriptor = {
  id: string
  name: string
  path: string
  renderer: TLogStreamFileRenderer
}

export function makeLogStreamFileDescriptors({
  configId,
  executionId,
}: {
  configId: string
  executionId?: string | null
}): {
  input: TLogStreamFileDescriptor | null
  output: TLogStreamFileDescriptor | null
  showOutput: boolean
} {
  if (!executionId) {
    return {
      input: null,
      output: null,
      showOutput: false,
    }
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
  }
}

export function prependLogStreamFile<T>({ file, files }: { file: T | null; files: T[] }): T[] {
  return file ? [file, ...files] : files
}

function makeVirtualLogAsset({
  id,
  path,
  contentType,
}: {
  id: string
  path: string
  contentType: AssetContentType
}): IAsset {
  return {
    id,
    path,
    full_path: path,
    bucket_name: '',
    is_directory: false,
    content_type: contentType,
    size: 0,
    label: AssetLabel.task_config,
    status: 'created',
  } as IAsset
}

export function makeTaskConfigurationFile<T extends Record<string, unknown>>({
  descriptor,
  config,
}: {
  descriptor: TLogStreamFileDescriptor
  config: ITaskConfig<T>
}): TActivityCustomFile {
  return {
    id: descriptor.id,
    entity: config,
    asset: makeVirtualLogAsset({
      id: descriptor.id,
      path: descriptor.path,
      contentType: AssetContentType.json,
    }),
    assetPath: descriptor.path,
    name: descriptor.name,
    enforcedRenderType: AssetContentType.json,
    renderer: ActivityCustomFileRenderer.TaskConfigurationViewer,
  }
}

export function makeTaskLogsFile({
  descriptor,
  execution,
}: {
  descriptor: TLogStreamFileDescriptor
  execution: ITaskActivity
}): TActivityCustomFile {
  return {
    id: descriptor.id,
    entity: execution as TActivityCustomFile['entity'],
    asset: makeVirtualLogAsset({
      id: descriptor.id,
      path: descriptor.path,
      contentType: AssetContentType.text,
    }),
    assetPath: descriptor.path,
    name: descriptor.name,
    enforcedRenderType: AssetContentType.text,
    renderer: ActivityCustomFileRenderer.TaskLogsViewer,
  }
}

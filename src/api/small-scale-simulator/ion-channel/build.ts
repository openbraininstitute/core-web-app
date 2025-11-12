import { EntitycoreExecutionStatus } from '@/api/entitycore/types/entities/execution';
import { smallScaleSimulatorApi } from '@/api/small-scale-simulator/utils';
import { getEntityCoreContext } from '@/api/entitycore/utils';

import type { WorkspaceContext } from '@/types/common';

const baseUrl = '/ion-channel/build';

export type TJobBuildResponse = {
  id: string;
  status: EntitycoreExecutionStatus;
  output: unknown | null;
  created_at: string;
  enqueued_at: string;
  started_at: string | null;
  ended_at: string | null;
  queue_position: number | null;
  error: string | null;
};

export enum MessageType {
  STATUS = 'status',
  DATA = 'data',
  KEEP_ALIVE = 'keep_alive',
}

interface MessageBase {
  timestamp: string;
  ctx?: Record<string, unknown> | null;
}

export interface StatusMessage extends MessageBase {
  message_type: MessageType.STATUS;
  status: EntitycoreExecutionStatus;
  extra?: string | null;
}

export const DataType = {
  BuildInput: 'build_input',
  BuildOutput: 'build_output',
} as const;

export type TDataType = (typeof DataType)[keyof typeof DataType];

export interface DataMessage<T = unknown> extends MessageBase {
  message_type: MessageType.DATA;
  data_type?: TDataType;
  data: T;
}

export interface KeepAliveMessage extends MessageBase {
  message_type: MessageType.STATUS;
  type: MessageType.KEEP_ALIVE;
}

export type TStreamMessage<T> = StatusMessage | DataMessage<T> | KeepAliveMessage;

export async function build(params: {
  ctx: WorkspaceContext;
  payload: Record<string, any>;
  signal?: AbortSignal;
  stream: true;
}): Promise<Response>;

export async function build(params: {
  ctx: WorkspaceContext;
  payload: Record<string, any>;
  signal?: AbortSignal;
  stream?: false;
}): Promise<TJobBuildResponse>;

export async function build({
  ctx,
  payload,
  signal,
  stream = false,
}: {
  ctx: WorkspaceContext;
  payload: Record<string, any>;
  stream?: boolean;
  signal?: AbortSignal;
}): Promise<TJobBuildResponse | Response> {
  const api = await smallScaleSimulatorApi();
  return api.post<TJobBuildResponse>(
    `${baseUrl}/run`,
    {
      queryParams: { stream },
      headers: {
        ...getEntityCoreContext(ctx).headers,
        accept: 'application/x-ndjson',
        'Content-Type': 'application/json',
      },
      body: payload,
      signal,
    },
    { asRawResponse: stream }
  );
}

type TJobBuildStatusResponse = {
  id: string;
  status: string;
  output: string;
  created_at: string;
  enqueued_at: string;
  started_at: string;
  ended_at: string;
  queue_position: number;
  error: string;
};

export async function track({
  ctx,
  signal,
  jobId,
}: {
  ctx: WorkspaceContext;
  jobId?: string;
  signal?: AbortSignal;
}): Promise<TJobBuildStatusResponse> {
  const api = await smallScaleSimulatorApi();
  return api.get<TJobBuildStatusResponse>(`${baseUrl}/jobs/${jobId}`, {
    headers: {
      ...getEntityCoreContext(ctx).headers,
      accept: 'application/x-ndjson',
      'Content-Type': 'application/json',
    },
    signal,
  });
}

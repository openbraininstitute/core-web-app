import 'server-only';

import { auth } from '@/auth';
import {
  buildUpstreamHeaders,
  buildUpstreamJobUrl,
  debugLog,
  parseCommonQueryParams,
} from '@/features/task-logs-stream/endpoints/shared';
import { redactSensitive } from '@/features/task-logs-stream/helpers';
import { type IJobRead, LogLevelDict } from '@/features/task-logs-stream/types';
import { log } from '@/utils/logger';

import type { NextRequest } from 'next/server';

interface IReadRequestParams {
  executionId: string;
  virtualLabId: string;
  projectId: string;
  debugLogs: boolean;
}

function redactUnknownPayload({ payload }: { payload: unknown }): unknown {
  try {
    const serializedPayload = JSON.stringify(payload);
    if (!serializedPayload) return payload;
    return JSON.parse(redactSensitive({ value: serializedPayload })) as unknown;
  } catch {
    return payload;
  }
}

async function requestExecutionById({
  executionId,
  headers,
}: {
  executionId: string;
  headers: Record<string, string>;
}) {
  const response = await fetch(buildUpstreamJobUrl({ jobId: executionId }), {
    method: 'GET',
    headers: {
      accept: 'application/json',
      ...headers,
    },
  });

  const rawBody = await response.text();
  const hasBody = rawBody.trim().length > 0;
  if (!hasBody) {
    return {
      statusCode: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      data: null,
    };
  }

  try {
    const parsedData = JSON.parse(rawBody) as unknown;
    return {
      statusCode: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      data: redactUnknownPayload({ payload: parsedData }),
    };
  } catch (error) {
    throw new Error(
      `Invalid JSON from upstream execution endpoint: ${
        error instanceof Error ? error.message : 'Unknown parse error'
      }`
    );
  }
}

function parseAndValidateParams({
  request,
  executionId,
}: {
  request: NextRequest;
  executionId: string;
}): IReadRequestParams | Response {
  const trimmedExecutionId = executionId.trim();
  const commonParams = parseCommonQueryParams({ request });

  if (!trimmedExecutionId) {
    return Response.json({ error: 'Missing required route parameter: id' }, { status: 400 });
  }

  if (commonParams instanceof Response) {
    return commonParams;
  }

  return {
    executionId: trimmedExecutionId,
    ...commonParams,
  };
}

export async function handleTaskJobReadRoute({
  request,
  id,
}: {
  request: NextRequest;
  id: string;
}) {
  const session = await auth();
  if (!session) {
    return new Response('Unauthorized', {
      status: 401,
      statusText: 'The supplied authentication is not authorized for this action',
    });
  }

  const params = parseAndValidateParams({ request, executionId: id });
  if (params instanceof Response) {
    return params;
  }

  const { executionId, virtualLabId, projectId, debugLogs } = params;
  const serverDebugEnabled = process.env.TASK_LOGS_STREAM_DEBUG === 'true';
  const shouldDebugLog = serverDebugEnabled || debugLogs;

  try {
    debugLog({
      enabled: shouldDebugLog,
      message: '[task-manager/job/read] proxy request',
      payload: { executionId, virtualLabId, projectId },
    });

    const upstreamResponse = await requestExecutionById({
      executionId,
      headers: buildUpstreamHeaders({
        accessToken: session.accessToken,
        virtualLabId,
        projectId,
      }),
    });

    debugLog({
      enabled: shouldDebugLog,
      level: LogLevelDict.Info,
      message: '[task-manager/job/read] upstream response',
      payload: {
        executionId,
        status: upstreamResponse.statusCode,
        contentType: upstreamResponse.headers['content-type'],
      },
    });

    return Response.json((upstreamResponse.data ?? null) as IJobRead | null, {
      status: upstreamResponse.statusCode,
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    log(LogLevelDict.Error, '[task-manager/job/read] upstream request failed', {
      executionId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return Response.json(
      {
        error: 'Unable to fetch job details',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

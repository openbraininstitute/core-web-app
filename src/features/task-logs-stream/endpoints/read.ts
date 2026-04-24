import 'server-only';

import { auth } from '@/auth';
import {
  buildUpstreamHeaders,
  buildUpstreamJobUrl,
  debugLog,
  isJsonContentType,
  parseCommonQueryParams,
  requestJsonWithHeaders,
  truncateForLog,
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

interface IUpstreamReadSuccess {
  kind: 'success';
  statusCode: number;
  contentType: string | undefined;
  data: unknown;
}

interface IUpstreamReadFailure {
  kind: 'failure';
  statusCode: number;
  contentType: string | undefined;
  reason: 'upstream-error-status' | 'non-json-content-type' | 'invalid-json';
  bodySnippet: string;
  parseError?: string;
}

type TUpstreamReadResult = IUpstreamReadSuccess | IUpstreamReadFailure;

function redactUnknownPayload({ payload }: { payload: unknown }): unknown {
  try {
    const serializedPayload = JSON.stringify(payload);
    if (!serializedPayload) return payload;
    return JSON.parse(redactSensitive({ value: serializedPayload })) as unknown;
  } catch {
    return payload;
  }
}

function resolveContentType({
  contentTypeHeader,
}: {
  contentTypeHeader: string | string[] | undefined;
}): string | undefined {
  return Array.isArray(contentTypeHeader) ? contentTypeHeader[0] : contentTypeHeader;
}

async function requestExecutionById({
  executionId,
  headers,
}: {
  executionId: string;
  headers: Record<string, string>;
}): Promise<TUpstreamReadResult> {
  const upstreamResponse = await requestJsonWithHeaders({
    urlString: buildUpstreamJobUrl({ jobId: executionId }),
    headers,
  });

  const contentType = resolveContentType({
    contentTypeHeader: upstreamResponse.headers['content-type'],
  });
  const trimmedBody = upstreamResponse.rawBody.trim();
  const hasBody = trimmedBody.length > 0;

  if (upstreamResponse.statusCode >= 400) {
    return {
      kind: 'failure',
      statusCode: upstreamResponse.statusCode,
      contentType,
      reason: 'upstream-error-status',
      bodySnippet: hasBody
        ? truncateForLog({ value: redactSensitive({ value: trimmedBody }) })
        : '',
    };
  }

  if (!hasBody) {
    return {
      kind: 'success',
      statusCode: upstreamResponse.statusCode,
      contentType,
      data: null,
    };
  }

  if (!isJsonContentType({ headers: upstreamResponse.headers })) {
    return {
      kind: 'failure',
      statusCode: upstreamResponse.statusCode,
      contentType,
      reason: 'non-json-content-type',
      bodySnippet: truncateForLog({ value: redactSensitive({ value: trimmedBody }) }),
    };
  }

  try {
    const parsedData = JSON.parse(upstreamResponse.rawBody) as unknown;
    return {
      kind: 'success',
      statusCode: upstreamResponse.statusCode,
      contentType,
      data: redactUnknownPayload({ payload: parsedData }),
    };
  } catch (error) {
    return {
      kind: 'failure',
      statusCode: upstreamResponse.statusCode,
      contentType,
      reason: 'invalid-json',
      bodySnippet: truncateForLog({ value: redactSensitive({ value: trimmedBody }) }),
      parseError: error instanceof Error ? error.message : 'Unknown parse error',
    };
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

function buildFailureResponse({ failure }: { failure: IUpstreamReadFailure }): Response {
  const detailsByReason: Record<IUpstreamReadFailure['reason'], string> = {
    'upstream-error-status': 'Upstream responded with an error status',
    'non-json-content-type': 'Upstream responded with a non-JSON content type',
    'invalid-json': 'Upstream response body was not valid JSON',
  };

  const clientStatus = failure.reason === 'upstream-error-status' ? failure.statusCode : 502;

  return Response.json(
    {
      error: 'Unable to fetch job details',
      details: detailsByReason[failure.reason],
      upstream: {
        status: failure.statusCode,
        contentType: failure.contentType,
        reason: failure.reason,
        ...(failure.parseError ? { parseError: failure.parseError } : {}),
        ...(failure.bodySnippet ? { bodySnippet: failure.bodySnippet } : {}),
      },
    },
    { status: clientStatus, headers: { 'Cache-Control': 'no-store' } }
  );
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

    const upstreamResult = await requestExecutionById({
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
        status: upstreamResult.statusCode,
        contentType: upstreamResult.contentType,
        ...(upstreamResult.kind === 'failure' ? { reason: upstreamResult.reason } : {}),
      },
    });

    if (upstreamResult.kind === 'failure') {
      log(LogLevelDict.Error, '[task-manager/job/read] upstream returned unexpected response', {
        executionId,
        status: upstreamResult.statusCode,
        contentType: upstreamResult.contentType,
        reason: upstreamResult.reason,
        parseError: upstreamResult.parseError,
        bodySnippet: upstreamResult.bodySnippet,
      });
      return buildFailureResponse({ failure: upstreamResult });
    }

    return Response.json((upstreamResult.data ?? null) as IJobRead | null, {
      status: upstreamResult.statusCode,
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
      { status: 502 }
    );
  }
}

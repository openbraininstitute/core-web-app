import 'server-only';

import { auth } from '@/auth';
import {
  buildUpstreamHeaders,
  buildUpstreamJobUrl,
  debugLog,
  getResponseContentType,
  parseCommonQueryParams,
  requestStreamWithHeaders,
} from '@/features/task-logs-stream/endpoints/shared';
import { redactSensitive } from '@/features/task-logs-stream/helpers';
import { LogLevelDict } from '@/features/task-logs-stream/types';

import type { NextRequest } from 'next/server';

interface IStreamRequestParams {
  jobId: string;
  virtualLabId: string;
  projectId: string;
  debugLogs: boolean;
}

function createRedactedStream({
  source,
}: {
  source: ReadableStream<Uint8Array>;
}): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = source.getReader();
      let buffer = '';

      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          if (!value) continue;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            controller.enqueue(encoder.encode(`${redactSensitive({ value: line })}\n`));
          }
        }

        if (buffer.length > 0) {
          controller.enqueue(encoder.encode(redactSensitive({ value: buffer })));
        }

        controller.close();
      } catch (error) {
        controller.error(error);
      } finally {
        reader.releaseLock();
      }
    },
  });
}

function parseAndValidateParams({
  request,
}: {
  request: NextRequest;
}): IStreamRequestParams | Response {
  const jobId = request.nextUrl.searchParams.get('jobId');
  const commonParams = parseCommonQueryParams({ request });

  if (!jobId) {
    return Response.json({ error: 'Missing required query parameter: jobId' }, { status: 400 });
  }

  if (commonParams instanceof Response) {
    return commonParams;
  }

  return { jobId, ...commonParams };
}

export async function handleTaskLogsStreamRoute({ request }: { request: NextRequest }) {
  const serverDebugEnabled = process.env.TASK_LOGS_STREAM_DEBUG === 'true';

  const session = await auth();
  if (!session) {
    return new Response('Unauthorized', {
      status: 401,
      statusText: 'The supplied authentication is not authorized for this action',
    });
  }

  const params = parseAndValidateParams({ request });
  if (params instanceof Response) {
    return params;
  }

  const { jobId, projectId, virtualLabId, debugLogs } = params;
  const shouldDebugLog = serverDebugEnabled || debugLogs;
  const upstreamUrl = buildUpstreamJobUrl({ jobId, stream: true });

  debugLog({
    enabled: shouldDebugLog,
    level: LogLevelDict.Info,
    message: '[task-manager/job/stream] proxy request',
    payload: {
      jobId,
      virtualLabId,
      projectId,
      upstreamUrl,
    },
  });

  try {
    const upstreamResponse = await requestStreamWithHeaders({
      urlString: upstreamUrl,
      headers: buildUpstreamHeaders({
        accessToken: session.accessToken,
        virtualLabId,
        projectId,
      }),
    });

    debugLog({
      enabled: shouldDebugLog,
      level: LogLevelDict.Info,
      message: '[task-manager/job/stream] upstream connected',
      payload: {
        jobId,
        status: upstreamResponse.statusCode,
        contentType: upstreamResponse.headers['content-type'],
      },
    });

    const redactedBody = createRedactedStream({ source: upstreamResponse.body });

    return new Response(redactedBody, {
      status: upstreamResponse.statusCode,
      headers: {
        'Content-Type': getResponseContentType({ headers: upstreamResponse.headers }),
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    debugLog({
      enabled: shouldDebugLog,
      level: LogLevelDict.Error,
      message: '[task-manager/job/stream] upstream stream failed',
      payload: {
        jobId,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    });

    return Response.json(
      {
        error: 'Unable to establish stream connection',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

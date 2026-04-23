import 'server-only';

import { auth } from '@/auth';
import { redactSensitive } from '@/features/task-logs-stream/helpers';
import { LogLevelDict, type TLogLevel } from '@/features/task-logs-stream/types';
import { log } from '@/utils/logger';

import type { NextRequest } from 'next/server';

import http from 'node:http';
import https from 'node:https';
import { Readable } from 'node:stream';

const DEFAULT_LAUNCH_SYSTEM_BASE_URL = 'https://127.0.0.1:4444/api/launch-system';
interface IStreamRequestParams {
  jobId: string;
  virtualLabId: string;
  projectId: string;
  debugLogs: boolean;
}

interface IUpstreamStreamResponse {
  statusCode: number;
  headers: http.IncomingHttpHeaders;
  body: ReadableStream<Uint8Array>;
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

function buildUpstreamStreamUrl({ jobId }: { jobId: string }) {
  const baseUrl = process.env.LAUNCH_SYSTEM_URL ?? DEFAULT_LAUNCH_SYSTEM_BASE_URL;
  const normalizedBaseUrl = baseUrl.replace(/\/+$/, '');
  return `${normalizedBaseUrl}/job/${encodeURIComponent(jobId)}/stream`;
}

function parseAndValidateParams({
  request,
}: {
  request: NextRequest;
}): IStreamRequestParams | Response {
  const jobId = request.nextUrl.searchParams.get('jobId');
  const virtualLabId = request.nextUrl.searchParams.get('virtualLabId');
  const projectId = request.nextUrl.searchParams.get('projectId');
  const debugLogsParam = request.nextUrl.searchParams.get('debugLogs');
  const debugLogs = debugLogsParam === '1' || debugLogsParam === 'true';

  if (!jobId) {
    return Response.json({ error: 'Missing required query parameter: jobId' }, { status: 400 });
  }

  if (!virtualLabId || !projectId) {
    return Response.json(
      { error: 'Missing required query parameters: virtualLabId and projectId' },
      { status: 400 }
    );
  }

  return { jobId, virtualLabId, projectId, debugLogs };
}

function getResponseContentType({ headers }: { headers: http.IncomingHttpHeaders }) {
  const contentType = headers['content-type'];
  if (Array.isArray(contentType)) {
    return contentType[0] ?? 'text/plain; charset=utf-8';
  }
  return contentType ?? 'text/plain; charset=utf-8';
}

function requestStreamWithHeaders({
  urlString,
  headers,
}: {
  urlString: string;
  headers: Record<string, string>;
}): Promise<IUpstreamStreamResponse> {
  return new Promise((resolve, reject) => {
    const url = new URL(urlString);
    const client = url.protocol === 'https:' ? https : http;

    const request = client.request(
      url,
      {
        method: 'GET',
        headers: {
          accept: 'application/json, text/plain;q=0.9, text/event-stream;q=0.8, */*;q=0.7',
          ...headers,
        },
        ...(url.protocol === 'https:' ? { rejectUnauthorized: false } : {}),
      },
      (response) => {
        if (!response) {
          reject(new Error('No response received from upstream'));
          return;
        }

        resolve({
          statusCode: response.statusCode ?? 500,
          headers: response.headers,
          body: Readable.toWeb(response) as ReadableStream<Uint8Array>,
        });
      }
    );

    request.on('error', reject);
    request.end();
  });
}

function debugLog({
  enabled,
  level,
  message,
  payload,
}: {
  enabled: boolean;
  level: TLogLevel;
  message: string;
  payload?: unknown;
}) {
  if (!enabled) return;
  log(level, message, payload);
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
  const upstreamUrl = buildUpstreamStreamUrl({ jobId });

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
      headers: {
        ...(session.accessToken ? { Authorization: `Bearer ${session.accessToken}` } : {}),
        'virtual-lab-id': virtualLabId,
        'project-id': projectId,
      },
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

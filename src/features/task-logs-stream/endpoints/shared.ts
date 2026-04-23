import 'server-only';

import { LogLevelDict, type TLogLevel } from '@/features/task-logs-stream/types';
import { log } from '@/utils/logger';

import type { NextRequest } from 'next/server';

import http from 'node:http';
import https from 'node:https';
import { Readable } from 'node:stream';

const DEFAULT_LAUNCH_SYSTEM_BASE_URL = 'https://127.0.0.1:4444/api/launch-system';

export interface ICommonQueryParams {
  virtualLabId: string;
  projectId: string;
  debugLogs: boolean;
}

export interface IUpstreamStreamResponse {
  statusCode: number;
  headers: http.IncomingHttpHeaders;
  body: ReadableStream<Uint8Array>;
}

export function parseCommonQueryParams({
  request,
}: {
  request: NextRequest;
}): ICommonQueryParams | Response {
  const virtualLabId = request.nextUrl.searchParams.get('virtualLabId');
  const projectId = request.nextUrl.searchParams.get('projectId');
  const debugLogsParam = request.nextUrl.searchParams.get('debugLogs');
  const debugLogs = debugLogsParam === '1' || debugLogsParam === 'true';

  if (!virtualLabId || !projectId) {
    return Response.json(
      { error: 'Missing required query parameters: virtualLabId and projectId' },
      { status: 400 }
    );
  }

  return { virtualLabId, projectId, debugLogs };
}

export function buildUpstreamJobUrl({ jobId, stream }: { jobId: string; stream?: boolean }) {
  const baseUrl = process.env.LAUNCH_SYSTEM_URL ?? DEFAULT_LAUNCH_SYSTEM_BASE_URL;
  const normalizedBaseUrl = baseUrl.replace(/\/+$/, '');
  const suffix = stream ? '/stream' : '';
  return `${normalizedBaseUrl}/job/${encodeURIComponent(jobId)}${suffix}`;
}

export function buildUpstreamHeaders({
  accessToken,
  virtualLabId,
  projectId,
}: {
  accessToken?: string;
  virtualLabId: string;
  projectId: string;
}) {
  return {
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    'virtual-lab-id': virtualLabId,
    'project-id': projectId,
  };
}

export function getResponseContentType({ headers }: { headers: http.IncomingHttpHeaders }) {
  const contentType = headers['content-type'];
  if (Array.isArray(contentType)) {
    return contentType[0] ?? 'text/plain; charset=utf-8';
  }
  return contentType ?? 'text/plain; charset=utf-8';
}

export function debugLog({
  enabled,
  level,
  message,
  payload,
}: {
  enabled: boolean;
  level?: TLogLevel;
  message: string;
  payload?: unknown;
}) {
  if (!enabled) return;
  log(level ?? LogLevelDict.Info, message, payload);
}

export function requestStreamWithHeaders({
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

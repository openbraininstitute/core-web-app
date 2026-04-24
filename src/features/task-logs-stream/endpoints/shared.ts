import 'server-only';

import { config } from '@/config';
import { LogLevelDict, type TLogLevel } from '@/features/task-logs-stream/types';
import { log } from '@/utils/logger';

import type { NextRequest } from 'next/server';

import http from 'node:http';
import https from 'node:https';
import { Readable } from 'node:stream';

export interface ICommonQueryParams {
  virtualLabId: string;
  projectId: string;
  debugLogs: boolean;
}

/**
 * shape compatible with both Node's `http.IncomingHttpHeaders` and a plain
 * object derived from `fetch`'s `Headers`. Keys are expected to be lowercase
 */
export type TUpstreamHeaders = Record<string, string | string[] | undefined>;

export interface IUpstreamStreamResponse {
  statusCode: number;
  headers: TUpstreamHeaders;
  body: ReadableStream<Uint8Array>;
}

export interface IUpstreamJsonResponse {
  statusCode: number;
  headers: TUpstreamHeaders;
  rawBody: string;
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
  const baseUrl = config.LAUNCH_SYSTEM_URL;
  const normalizedBaseUrl = baseUrl?.replace(/\/+$/, '') ?? '';
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

export function getResponseContentType({ headers }: { headers: TUpstreamHeaders }) {
  const contentType = headers['content-type'];
  if (Array.isArray(contentType)) {
    return contentType[0] ?? 'text/plain; charset=utf-8';
  }
  return contentType ?? 'text/plain; charset=utf-8';
}

export function isJsonContentType({ headers }: { headers: TUpstreamHeaders }): boolean {
  const contentType = getResponseContentType({ headers }).toLowerCase();
  return contentType.includes('application/json') || contentType.includes('+json');
}

export function truncateForLog({ value, max = 200 }: { value: string; max?: number }): string {
  const compact = value.replace(/\s+/g, ' ').trim();
  if (compact.length <= max) return compact;
  return `${compact.slice(0, max)}…`;
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

const STREAM_ACCEPT_HEADER =
  'application/json, text/plain;q=0.9, text/event-stream;q=0.8, */*;q=0.7';
const JSON_ACCEPT_HEADER = 'application/json';

/**
 * only loopback targets are expected to use a self-signed TLS cert (AWS SSM
 * port-forward in local dev).
 * every other upstream (preview, staging, production)
 * is a real CDN/ALB that handles TLS properly and often issues legitimate
 * redirects (trailing-slash canonicalization, auth edge, etc.) that `fetch`
 * follows transparently — something `node:https.request` does not do
 */
function isLoopbackHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
}

function fetchHeadersToPlainObject(headers: Headers): TUpstreamHeaders {
  const result: TUpstreamHeaders = {};
  headers.forEach((value, key) => {
    result[key.toLowerCase()] = value;
  });
  return result;
}

function requestStreamViaNodeHttps({
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
          accept: STREAM_ACCEPT_HEADER,
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

async function requestStreamViaFetch({
  urlString,
  headers,
}: {
  urlString: string;
  headers: Record<string, string>;
}): Promise<IUpstreamStreamResponse> {
  const response = await fetch(urlString, {
    method: 'GET',
    headers: {
      accept: STREAM_ACCEPT_HEADER,
      ...headers,
    },
    redirect: 'follow',
    cache: 'no-store',
  });

  if (!response.body) {
    throw new Error('No response body received from upstream');
  }

  return {
    statusCode: response.status,
    headers: fetchHeadersToPlainObject(response.headers),
    body: response.body,
  };
}

function requestJsonViaNodeHttps({
  urlString,
  headers,
}: {
  urlString: string;
  headers: Record<string, string>;
}): Promise<IUpstreamJsonResponse> {
  return new Promise((resolve, reject) => {
    const url = new URL(urlString);
    const client = url.protocol === 'https:' ? https : http;

    const request = client.request(
      url,
      {
        method: 'GET',
        headers: {
          accept: JSON_ACCEPT_HEADER,
          ...headers,
        },
        ...(url.protocol === 'https:' ? { rejectUnauthorized: false } : {}),
      },
      (response) => {
        if (!response) {
          reject(new Error('No response received from upstream'));
          return;
        }

        let rawBody = '';
        response.setEncoding('utf8');
        response.on('data', (chunk) => {
          rawBody += chunk;
        });
        response.on('end', () => {
          resolve({
            statusCode: response.statusCode ?? 500,
            headers: response.headers,
            rawBody,
          });
        });
      }
    );

    request.on('error', reject);
    request.end();
  });
}

async function requestJsonViaFetch({
  urlString,
  headers,
}: {
  urlString: string;
  headers: Record<string, string>;
}): Promise<IUpstreamJsonResponse> {
  const response = await fetch(urlString, {
    method: 'GET',
    headers: {
      accept: JSON_ACCEPT_HEADER,
      ...headers,
    },
    redirect: 'follow',
    cache: 'no-store',
  });

  return {
    statusCode: response.status,
    headers: fetchHeadersToPlainObject(response.headers),
    rawBody: await response.text(),
  };
}

export function requestStreamWithHeaders({
  urlString,
  headers,
}: {
  urlString: string;
  headers: Record<string, string>;
}): Promise<IUpstreamStreamResponse> {
  const url = new URL(urlString);
  if (isLoopbackHost(url.hostname)) {
    return requestStreamViaNodeHttps({ urlString, headers });
  }
  return requestStreamViaFetch({ urlString, headers });
}

export function requestJsonWithHeaders({
  urlString,
  headers,
}: {
  urlString: string;
  headers: Record<string, string>;
}): Promise<IUpstreamJsonResponse> {
  const url = new URL(urlString);
  if (isLoopbackHost(url.hostname)) {
    return requestJsonViaNodeHttps({ urlString, headers });
  }
  return requestJsonViaFetch({ urlString, headers });
}

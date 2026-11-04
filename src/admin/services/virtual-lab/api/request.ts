import { virtualLabRootApi } from '@/api/virtual-lab-svc/utils';
import { compactRecord } from '@/utils/dictionary';

import type { MessageEnvelope } from './admin-types';

export const JSON_HEADERS = { 'Content-Type': 'application/json', accept: 'application/json' };
const ACCEPT_HEADERS = { accept: 'application/json' };

export async function getJson<T>(path: string, params?: Record<string, unknown>) {
  const api = await virtualLabRootApi();
  return api.get<T>(`/admin${path}`, {
    headers: ACCEPT_HEADERS,
    ...(params && { queryParams: compactRecord(params) }),
  });
}

export async function getEnveloped<T>(path: string, params?: Record<string, unknown>) {
  return (await getJson<MessageEnvelope<T>>(path, params)).data;
}

export async function patchJson(path: string, body: Record<string, unknown>) {
  const api = await virtualLabRootApi();
  await api.patch(`/admin${path}`, { headers: JSON_HEADERS, body });
}

export async function putJson(path: string, body: Record<string, unknown>) {
  const api = await virtualLabRootApi();
  await api.put(`/admin${path}`, { headers: JSON_HEADERS, body });
}

export async function deleteAt(path: string) {
  const api = await virtualLabRootApi();
  await api.delete(`/admin${path}`, { headers: ACCEPT_HEADERS });
}

export async function postJson(path: string, body?: Record<string, unknown>) {
  const api = await virtualLabRootApi();
  await api.post(`/admin${path}`, { headers: JSON_HEADERS, ...(body && { body }) });
}

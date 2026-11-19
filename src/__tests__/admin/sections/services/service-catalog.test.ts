import { describe, expect, it } from 'vitest';

import {
  SERVER_SERVICE_CATALOG,
  SERVICE_CATALOG,
  serviceBaseUrl,
} from '@/admin/sections/services/service-catalog';

describe('serviceBaseUrl', () => {
  it('probes auth-manager at the root, not under /v1', () => {
    const authManager = SERVICE_CATALOG.find((service) => service.key === 'auth-manager');
    expect(serviceBaseUrl(authManager ?? {}, 'https://host/api/auth-manager/v1')).toBe(
      'https://host/api/auth-manager'
    );
  });

  it('ignores a trailing slash', () => {
    const authManager = SERVICE_CATALOG.find((service) => service.key === 'auth-manager');
    expect(serviceBaseUrl(authManager ?? {}, 'https://host/api/auth-manager/v1/')).toBe(
      'https://host/api/auth-manager'
    );
    expect(serviceBaseUrl({}, 'https://host/api/entitycore/')).toBe('https://host/api/entitycore');
  });

  it('leaves other services alone', () => {
    expect(serviceBaseUrl({}, 'https://host/api/entitycore')).toBe('https://host/api/entitycore');
  });
});

describe('SERVICE_CATALOG', () => {
  it.each([
    'launch-system',
    'cell-api',
    'accounting',
    'grading',
  ])('probes %s from the server, not the browser', (key) => {
    expect(SERVICE_CATALOG.some((service) => service.key === key)).toBe(false);
    expect(SERVER_SERVICE_CATALOG.some((service) => service.key === key)).toBe(true);
  });

  it('gives each service its own key', () => {
    const keys = [...SERVICE_CATALOG, ...SERVER_SERVICE_CATALOG].map(({ key }) => key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

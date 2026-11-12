import { describe, expect, it } from 'vitest';

import {
  SERVICE_CATALOG,
  serviceBaseUrl,
} from '@/features/admin/sections/services/service-catalog';

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
  ])('has no browser probe for %s', (key) => {
    expect(SERVICE_CATALOG.some((service) => service.key === key)).toBe(false);
  });
});

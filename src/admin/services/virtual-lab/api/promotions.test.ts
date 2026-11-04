import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getPromotion, listPromotions, updatePromotion } from './promotions';

const api = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}));

vi.mock('@/api/virtual-lab-svc/utils', () => ({ virtualLabRootApi: async () => api }));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('promotions client', () => {
  it('unwraps the envelope and keeps a meaningful false and zero', async () => {
    const data = { promotions: [], pagination: { total: 0 } };
    api.get.mockResolvedValueOnce({ message: 'ok', data });

    await expect(listPromotions({ limit: 20, offset: 0, active: false })).resolves.toEqual(data);
    expect(api.get).toHaveBeenCalledWith(
      '/admin/promotions',
      expect.objectContaining({ queryParams: { limit: 20, offset: 0, active: false } })
    );
  });

  it('unwraps a single promotion', async () => {
    api.get.mockResolvedValueOnce({ message: 'ok', data: { id: 'p' } });
    await expect(getPromotion('p')).resolves.toEqual({ id: 'p' });
  });

  it('updates with PUT', async () => {
    await updatePromotion('p', { active: true });

    expect(api.put).toHaveBeenCalledWith(
      '/admin/promotions/p',
      expect.objectContaining({ body: { active: true } })
    );
  });
});

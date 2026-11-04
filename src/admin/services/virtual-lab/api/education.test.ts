import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/api/error';

import {
  createCourse,
  getCourseSeatBatches,
  searchCourses,
  transferSeats,
  updateCourse,
} from './education';

const api = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}));

vi.mock('@/api/virtual-lab-svc/utils', () => ({ virtualLabRootApi: async () => api }));

beforeEach(() => {
  vi.clearAllMocks();
});

function apiError(status: number) {
  const error = new ApiError('failed');
  error.cause = { status } as ApiError['cause'];
  return error;
}

describe('education client', () => {
  it('searches courses by lab name, outside /admin, and unwraps them', async () => {
    api.get.mockResolvedValueOnce({ message: 'ok', data: [{ id: 'c' }] });

    await expect(searchCourses('obi')).resolves.toEqual([{ id: 'c' }]);
    expect(api.get).toHaveBeenCalledWith(
      '/courses',
      expect.objectContaining({ queryParams: { vlab_name: 'obi' } })
    );
  });

  it('hands back a created course, so the page can open it', async () => {
    api.post.mockResolvedValueOnce({ message: 'ok', data: { id: 'c' } });

    await expect(createCourse({} as Parameters<typeof createCourse>[0])).resolves.toEqual({
      id: 'c',
    });
  });

  it('patches only what it is given', async () => {
    api.patch.mockResolvedValueOnce({ message: 'ok', data: {} });

    await updateCourse('c', { end_date: 'date' });

    expect(api.patch).toHaveBeenCalledWith(
      '/courses/c',
      expect.objectContaining({ body: { end_date: 'date' } })
    );
  });

  it('reads the batches of one course', async () => {
    api.get.mockResolvedValueOnce({ batches: [{ batch_id: 'b' }] });

    await expect(getCourseSeatBatches('c')).resolves.toEqual([{ batch_id: 'b' }]);
    expect(api.get).toHaveBeenCalledWith(
      '/seats/batches',
      expect.objectContaining({ queryParams: { course_id: 'c' } })
    );
  });

  it('puts the newest batch first', async () => {
    const older = { batch_id: 'older', created_at: '2026-01-01T00:00:00Z' };
    const newer = { batch_id: 'newer', created_at: '2026-02-01T00:00:00Z' };
    api.get.mockResolvedValueOnce({ batches: [older, newer] });

    await expect(getCourseSeatBatches('c')).resolves.toEqual([newer, older]);
  });

  it('treats a 404 as a course with no batches', async () => {
    api.get.mockRejectedValueOnce(apiError(404));
    await expect(getCourseSeatBatches('c')).resolves.toEqual([]);
  });

  it('keeps any other batch failure', async () => {
    const error = apiError(500);
    api.get.mockRejectedValueOnce(error);
    await expect(getCourseSeatBatches('c')).rejects.toBe(error);
  });

  it('transfers an amount or all', async () => {
    api.post.mockResolvedValue({ message: 'ok', data: {} });

    await transferSeats('a', 'b', 'all');

    expect(api.post).toHaveBeenCalledWith(
      '/seats/transfer',
      expect.objectContaining({
        body: { source_course_id: 'a', target_course_id: 'b', amount: 'all' },
      })
    );
  });
});

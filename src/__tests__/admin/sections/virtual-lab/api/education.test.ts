import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createCourse,
  getCourse,
  getCourseSeatBatches,
  searchCourses,
  transferSeats,
  updateCourse,
} from '@/admin/sections/virtual-lab/api/education';
import { ApiError } from '@/api/error';

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

const apiError = (status: number, code?: string) => new ApiError('failed', { status, code });

describe('education client', () => {
  it('searches courses by lab name, outside /admin, and unwraps them', async () => {
    api.get.mockResolvedValueOnce({ message: 'ok', data: [{ id: 'c' }] });

    await expect(searchCourses('obi')).resolves.toEqual([{ id: 'c' }]);
    expect(api.get).toHaveBeenCalledWith(
      '/courses',
      expect.objectContaining({ queryParams: { vlab_name: 'obi' } })
    );
  });

  it('encodes a course id from the URL as one path segment', async () => {
    api.get.mockResolvedValueOnce({ message: 'ok', data: { id: 'c' } });

    await getCourse('a/b');

    expect(api.get).toHaveBeenCalledWith('/courses/a%2Fb', expect.anything());
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

  it('reads the batches of one course, newest first', async () => {
    const older = { batch_id: 'older', created_at: '2026-01-01T00:00:00Z' };
    const newer = { batch_id: 'newer', created_at: '2026-02-01T00:00:00Z' };
    api.get.mockResolvedValueOnce({ batches: [older, newer] });

    await expect(getCourseSeatBatches('c')).resolves.toEqual([newer, older]);
    expect(api.get).toHaveBeenCalledWith(
      '/seats/batches',
      expect.objectContaining({ queryParams: { course_id: 'c' } })
    );
  });

  it("treats the API's not-found as a course with no batches", async () => {
    api.get.mockRejectedValueOnce(apiError(404, 'ENTITY_NOT_FOUND'));
    await expect(getCourseSeatBatches('c')).resolves.toEqual([]);
  });

  it.each([
    ['a 404 without the code', apiError(404)],
    ['any other failure', apiError(500)],
  ])('keeps %s', async (_name, error) => {
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

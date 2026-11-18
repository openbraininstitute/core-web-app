import { ApiError } from '@/api/error';

import { at, rootDelete, rootGet, rootSend } from './admin';

import type { VlmResponse } from '@/types/virtual-lab/common';
import type {
  AdminCourse,
  AdminCourseCreate,
  AdminCourseUpdate,
  AdminInstitution,
  AdminInstitutionUpdate,
  AdminSeatBatch,
} from './admin-types';

// Service-admin routes outside /admin, which has nothing for courses. The course seat and
// enrolment routes stay out: they accept a lab's admins but refuse service admins.
const send = (method: 'post' | 'patch', path: string, body?: Record<string, unknown>) =>
  rootSend<VlmResponse<{ id: string }>>(method, path, body);

// There is no way to list every course: a search needs part of a lab's name.
export const searchCourses = async (labName: string, signal?: AbortSignal) =>
  (await rootGet<VlmResponse<AdminCourse[]>>('/courses', { vlab_name: labName }, signal)).data;

export const getCourse = async (courseId: string, signal?: AbortSignal) =>
  (await rootGet<VlmResponse<AdminCourse>>(at`/courses/${courseId}`, undefined, signal)).data;

export const createCourse = async (course: AdminCourseCreate) =>
  (await send('post', '/courses', course)).data;

export const updateCourse = (courseId: string, update: AdminCourseUpdate) =>
  send('patch', at`/courses/${courseId}`, update);

export const activateCourse = (courseId: string) => send('post', at`/courses/${courseId}/activate`);

export const voidCourse = (courseId: string) => send('post', at`/courses/${courseId}/void`);

export const deleteCourse = (courseId: string) => rootDelete(at`/courses/${courseId}`);

export const searchInstitutions = async (query?: string, signal?: AbortSignal) =>
  (await rootGet<VlmResponse<AdminInstitution[]>>('/institutions/_search', { q: query }, signal))
    .data;

export const createInstitution = (institution: Omit<AdminInstitution, 'id'>) =>
  send('post', '/institutions', institution);

export const updateInstitution = (institutionId: string, update: AdminInstitutionUpdate) =>
  send('patch', at`/institutions/${institutionId}`, update);

// Asked for one course on purpose: a wider search labels every batch with the first seat's course.
// A course with no seats is a 404 with this code, unlike a missing route.
export async function getCourseSeatBatches(courseId: string, signal?: AbortSignal) {
  try {
    const { batches } = await rootGet<{ batches: AdminSeatBatch[] }>(
      '/seats/batches',
      { course_id: courseId },
      signal
    );
    // The API orders them by their random ID.
    return [...batches].sort((a, b) => b.created_at.localeCompare(a.created_at));
  } catch (error) {
    if (error instanceof ApiError && error.cause?.code === 'ENTITY_NOT_FOUND') return [];
    throw error;
  }
}

export const provisionSeats = (courseId: string, seats: number) =>
  send('post', '/seats/provision', { course_id: courseId, number_of_seats: seats });

export const transferSeats = (sourceId: string, targetId: string, amount: number | 'all') =>
  send('post', '/seats/transfer', {
    source_course_id: sourceId,
    target_course_id: targetId,
    amount,
  });

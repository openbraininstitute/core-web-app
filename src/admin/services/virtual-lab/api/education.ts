import { virtualLabRootApi } from '@/api/virtual-lab-svc/utils';
import { compactRecord } from '@/utils/dictionary';

import { isNotFound } from '../../../shared/errors';
import { JSON_HEADERS } from './request';

import type {
  AdminCourse,
  AdminCourseCreate,
  AdminCourseUpdate,
  AdminInstitution,
  AdminInstitutionUpdate,
  AdminSeatBatch,
  MessageEnvelope,
} from './admin-types';

// These are service-admin routes outside /admin: no admin equivalent exists. The course seat and
// enrolment routes stay out, as they accept a lab's admins but refuse service admins.
async function read<T>(path: string, params?: Record<string, unknown>) {
  const api = await virtualLabRootApi();
  return api.get<T>(path, {
    headers: JSON_HEADERS,
    ...(params && { queryParams: compactRecord(params) }),
  });
}

async function send(method: 'post' | 'patch', path: string, body?: Record<string, unknown>) {
  const api = await virtualLabRootApi();
  return api[method]<MessageEnvelope<{ id: string }>>(path, {
    headers: JSON_HEADERS,
    ...(body && { body }),
  });
}

// There is no way to list every course: a search needs part of a lab's name.
export const searchCourses = async (labName: string) =>
  (await read<MessageEnvelope<AdminCourse[]>>('/courses', { vlab_name: labName })).data;

export const getCourse = async (courseId: string) =>
  (await read<MessageEnvelope<AdminCourse>>(`/courses/${courseId}`)).data;

export const createCourse = async (course: AdminCourseCreate) =>
  (await send('post', '/courses', course)).data;

export const updateCourse = (courseId: string, update: AdminCourseUpdate) =>
  send('patch', `/courses/${courseId}`, update);

export const activateCourse = (courseId: string) => send('post', `/courses/${courseId}/activate`);

export const voidCourse = (courseId: string) => send('post', `/courses/${courseId}/void`);

export async function deleteCourse(courseId: string) {
  const api = await virtualLabRootApi();
  await api.delete(`/courses/${courseId}`, { headers: JSON_HEADERS });
}

export const searchInstitutions = async (query?: string) =>
  (await read<MessageEnvelope<AdminInstitution[]>>('/institutions/_search', { q: query })).data;

export const createInstitution = (institution: Omit<AdminInstitution, 'id'>) =>
  send('post', '/institutions', institution);

export const updateInstitution = (institutionId: string, update: AdminInstitutionUpdate) =>
  send('patch', `/institutions/${institutionId}`, update);

// Asked for one course on purpose: a wider search labels every batch with the first seat's course.
// A course with no seats is a 404 here.
export async function getCourseSeatBatches(courseId: string) {
  try {
    const { batches } = await read<{ batches: AdminSeatBatch[] }>('/seats/batches', {
      course_id: courseId,
    });
    return batches;
  } catch (error) {
    if (isNotFound(error)) return [];
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

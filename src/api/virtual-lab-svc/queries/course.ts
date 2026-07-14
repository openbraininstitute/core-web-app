import { virtualLabRootApi } from '../utils';

export interface Seat {
  id: string;
  course_id: string;
  institution_id: string;
  batch_id: string;
  is_consumed: boolean;
  previously_dropped: boolean;
  enrolment_id: string;
  credit_value: number;
  expiry_date: string;
  created_at: string;
  enrolment?: Enrolment;
}

export interface Enrolment {
  id: string;
  course_id: string;
  project_id: string;
  contact_email: string;
  student_id: string;
  claimed_by: string;
  activated_at: string;
  is_dropped: boolean;
  created_at: string;
  seat?: Seat;
}

export interface Course {
  id: string;
  virtual_lab_id: string;
  template_project_id: string;
  institution_id: string;
  start_date: string;
  end_date: string;
  last_drop_date: string;
  credits_per_seat?: number;
}

export interface SeatsResponse {
  data: Seat[];
  pagination: {
    page: number;
    page_size: number;
    total_items: number;
  };
}

export interface EnrolmentsResponse {
  enrolments: Enrolment[];
}

export interface Student {
  student_id: string;
  email: string;
}

export interface AssignmentResult {
  student_id: string;
  email: string;
  assignment_successful: boolean;
  seat_id: string;
  enrolment_id: string;
  project_id: string;
  credit_transferred_amount: number;
  email_sent: boolean;
  error?: string;
}

export interface AssignSeatsResponse {
  results: AssignmentResult[];
}

export interface DropResult {
  seat_id: string;
  is_dropped: boolean;
  error?: string;
}

export interface DropSeatsResponse {
  results: DropResult[];
}

export interface ClaimResponseCourse extends Course {
  virtual_lab_name?: string;
}

export interface ClaimResponseData {
  course?: ClaimResponseCourse;
  project_id?: string;
}

export interface ClaimResponse {
  data: ClaimResponseData;
}

export async function fetchSeats(courseId: string): Promise<SeatsResponse> {
  const api = await virtualLabRootApi();
  return api.get<SeatsResponse>(`/seats/courses/${courseId}`);
}

export async function fetchEnrolments(courseId: string): Promise<EnrolmentsResponse> {
  const api = await virtualLabRootApi();
  return api.get<EnrolmentsResponse>(`/courses/${courseId}/enrolments`);
}

export async function assignSeats(
  courseId: string,
  students: Student[]
): Promise<AssignSeatsResponse> {
  const api = await virtualLabRootApi();
  return api.post<AssignSeatsResponse>(`/seats/courses/${courseId}/assign`, {
    body: { students },
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  });
}

export async function dropSeats(courseId: string, seatIds: string[]): Promise<DropSeatsResponse> {
  const api = await virtualLabRootApi();
  return api.post<DropSeatsResponse>(`/seats/courses/${courseId}/drop`, {
    body: { seat_ids: seatIds },
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  });
}

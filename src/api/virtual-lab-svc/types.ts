import { z } from 'zod';
import {
  CreateSubscriptionRequestSchema,
  ProjectPayloadSchema,
  RoleSchema,
  VirtualLabPayloadSchema,
} from '@/api/virtual-lab-svc/validation';

export type VirtualLabPayload = z.infer<typeof VirtualLabPayloadSchema>;
export type Role = z.infer<typeof RoleSchema>;

export type ProjectPayload = z.infer<typeof ProjectPayloadSchema>;
export type CreateSubscriptionRequest = z.infer<typeof CreateSubscriptionRequestSchema>;
export enum LabTypeEnum {
  MY_LAB = 'my_lab',
  MEMBERSHIP_LABS = 'membership_labs',
  PENDING_LABS = 'pending_labs',
}

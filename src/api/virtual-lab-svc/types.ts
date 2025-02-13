import { z } from 'zod';
import {
  ProjectPayloadSchema,
  RoleSchema,
  VirtualLabPayloadSchema,
} from '@/api/virtual-lab-svc/validation';

export type VirtualLabPayload = z.infer<typeof VirtualLabPayloadSchema>;
export type Role = z.infer<typeof RoleSchema>;

export type ProjectPayload = z.infer<typeof ProjectPayloadSchema>;

import { z } from 'zod';

const EmailStatusSchema = z.enum([
  'none',
  'already_verified',
  'verified',
  'failed',
  'locked',
  'code_sent',
]);

export const RoleSchema = z.enum(['admin', 'member']);
export const VirtualLabPayloadSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  reference_email: z.string().email(),
  entity: z.string(),
  include_members: z
    .array(
      z.object({
        email: z.string().email(),
        role: RoleSchema,
      })
    )
    .nullable(),
  plan_id: z.number().optional(),
  email_status: EmailStatusSchema,
});

export const ProjectPayloadSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  include_members: z
    .array(
      z.object({
        email: z.string().email(),
        role: RoleSchema,
      })
    )
    .nullable(),
});

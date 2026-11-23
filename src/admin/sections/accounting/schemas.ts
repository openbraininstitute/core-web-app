import * as z from 'zod';

export const REASON_MAX_LENGTH = 500;

const id = z.guid();

/** Credits as a decimal string, so no float rounding ever touches money. */
export const Amount = z
  .string()
  .regex(/^\d{1,15}(\.\d{1,6})?$/, 'Use a number like 12.5, with at most 6 decimals')
  .refine((value) => /[1-9]/.test(value), 'Has to be more than 0');

export const TopUpBody = z.strictObject({ vlab_id: id, amount: Amount });
export const AssignBody = z.strictObject({ vlab_id: id, proj_id: id, amount: Amount });
export const ReverseBody = AssignBody;
export const MoveBody = z.strictObject({
  vlab_id: id,
  debited_from: id,
  credited_to: id,
  amount: Amount,
});
export const GrantBody = z.strictObject({ proj_id: id, amount: Amount });
export const DepleteProjectBody = z.strictObject({ proj_id: id });
export const DepleteVlabBody = z.strictObject({ vlab_id: id });
export const AccountStatusBody = z.strictObject({ enabled: z.boolean() });
export const RefundBody = z.strictObject({
  job_id: id,
  amount: Amount.optional(),
  reason: z.string().trim().min(1).max(REASON_MAX_LENGTH),
});

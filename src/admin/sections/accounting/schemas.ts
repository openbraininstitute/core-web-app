import * as z from 'zod';

export const REASON_MAX_LENGTH = 500;

const id = z.guid();

/** Credits as a decimal string, so no float rounding ever touches money. */
export const Amount = z
  .string()
  .regex(/^\d{1,15}(\.\d{1,2})?$/, 'Use a number like 12.50, with at most 2 decimals')
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

const START_GRACE_MS = 5 * 60_000;

const dateTime = z.iso.datetime({ offset: true });
const notPast = dateTime.refine(
  (value) => Date.parse(value) >= Date.now() - START_GRACE_MS,
  "Can't be in the past"
);

/** A share of the cost, `0.2` for 20% off, as a decimal string. */
export const Fraction = z
  .string()
  .regex(/^(0(\.\d{1,6})?|1(\.0{1,6})?)$/, 'Use a fraction from 0 to 1, with at most 6 decimals');

const endsAfterStart = ({
  valid_from: from,
  valid_to: to,
}: {
  valid_from?: string;
  valid_to?: string | null;
}) => !from || !to || Date.parse(to) > Date.parse(from);
const END_AFTER_START = { message: 'Has to end after it starts', path: ['valid_to'] };

export const DiscountBody = z
  .strictObject({
    vlab_id: id,
    discount: Fraction,
    valid_from: notPast,
    valid_to: notPast.optional(),
  })
  .refine(endsAfterStart, END_AFTER_START);

export const DiscountPatchBody = z
  .strictObject({
    discount: Fraction.optional(),
    valid_from: notPast.optional(),
    valid_to: notPast.nullable().optional(),
  })
  .refine((body) => Object.keys(body).length > 0, 'Change at least one field')
  .refine(endsAfterStart, END_AFTER_START);

export const EmptyBody = z.strictObject({});

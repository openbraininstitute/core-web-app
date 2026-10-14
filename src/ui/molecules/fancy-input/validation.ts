import { z } from 'zod';

/** The shapes a field can be asked for by name; anything else is passed as a zod schema. */
export type ValidationKeyword =
  | 'string'
  | 'email'
  | 'number'
  | 'integer'
  | 'url'
  | 'tel'
  | 'password'
  | 'date';

export type Validate = ValidationKeyword | z.ZodType;

/** Extra rules layered on a keyword. Ignored when a schema is passed. */
export type ValidationRules = {
  required?: boolean;
  /** Numeric minimum, or string minimum length. */
  min?: number;
  /** Numeric maximum, or string maximum length. */
  max?: number;
  pattern?: RegExp;
  messages?: Partial<Record<'required' | 'type' | 'min' | 'max' | 'pattern', string>>;
};

export type ValidationResult = { valid: boolean; error?: string };

const TEL_PATTERN = /^[+]?[\d\s().-]{6,}$/;
const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
// Matched before coercion: `Number(' ')` is 0, so whitespace would pass as a valid zero.
const NUMERIC_TEXT = /^-?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?$/;

function schemaFromKeyword(keyword: ValidationKeyword, rules: ValidationRules): z.ZodType {
  const m = rules.messages ?? {};

  switch (keyword) {
    case 'email':
      return z.email(m.type ?? 'Enter a valid email address');
    case 'url':
      return z.url(m.type ?? 'Enter a valid URL');
    case 'tel':
      return z.string().regex(TEL_PATTERN, m.type ?? 'Enter a valid phone number');
    case 'password': {
      let s = z.string();
      if (rules.min != null)
        s = s.min(rules.min, m.min ?? `Must be at least ${rules.min} characters`);
      return s.regex(PASSWORD_PATTERN, m.type ?? 'Min 8 chars with upper, lower & a number');
    }
    case 'date':
      return z.iso.date(m.type ?? 'Enter a valid date');
    case 'number':
    case 'integer': {
      let n = z.number();
      if (keyword === 'integer') n = n.int(m.type ?? 'Must be a whole number');
      if (rules.min != null) n = n.min(rules.min, m.min ?? `Must be ${rules.min} or more`);
      if (rules.max != null) n = n.max(rules.max, m.max ?? `Must be ${rules.max} or less`);
      return z
        .string()
        .trim()
        .regex(NUMERIC_TEXT, m.type ?? 'Must be a number')
        .transform(Number)
        .pipe(n);
    }
    default: {
      let s = z.string();
      if (rules.min != null)
        s = s.min(rules.min, m.min ?? `Must be at least ${rules.min} characters`);
      if (rules.max != null)
        s = s.max(rules.max, m.max ?? `Must be at most ${rules.max} characters`);
      if (rules.pattern) s = s.regex(rules.pattern, m.pattern ?? 'Invalid format');
      return s;
    }
  }
}

/**
 * Validates a raw input value against a keyword or zod schema, reporting the first issue only.
 * Empty values are valid unless `required` is set.
 */
export function validateValue(
  value: string,
  validate: Validate | undefined,
  rules: ValidationRules = {}
): ValidationResult {
  if (value === '') {
    return rules.required
      ? { valid: false, error: rules.messages?.required ?? 'This field is required' }
      : { valid: true };
  }
  if (!validate) return { valid: true };

  const schema = typeof validate === 'string' ? schemaFromKeyword(validate, rules) : validate;
  const result = schema.safeParse(value);
  return result.success
    ? { valid: true }
    : { valid: false, error: result.error.issues[0]?.message ?? 'Invalid value' };
}

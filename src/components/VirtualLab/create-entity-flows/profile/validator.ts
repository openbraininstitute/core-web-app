import { isEMailFromForbiddenCountry } from '@/util/email';

import type { RuleObject } from 'antd/es/form';
import type { ProfileFormData } from './types';

export function validate(data: ProfileFormData): boolean {
  const forbiddenCountry = isEMailFromForbiddenCountry(data.email);
  return !forbiddenCountry;
}

export function validateEMail(_rule: RuleObject, email: string): Promise<void> {
  const forbiddenCountry = isEMailFromForbiddenCountry(email);
  if (!forbiddenCountry) return Promise.resolve();

  return Promise.reject(
    new Error(
      `The platform is not available in ${forbiddenCountry}. Please select a different email.`
    )
  );
}

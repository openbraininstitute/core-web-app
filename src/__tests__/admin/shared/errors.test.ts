import { describe, expect, it } from 'vitest';

import { errorReason } from '@/admin/shared/errors';
import { ApiError } from '@/api/error';

describe('errorReason', () => {
  it("says a gate's 403 is missing access", () => {
    const error = new ApiError('Access denied', { status: 403, code: 'AUTHORIZATION_ERROR' });
    expect(errorReason(error)).toBe("Your account isn't allowed to do this.");
  });

  it("says the /admin gate's 403 is missing access, though it uses NOT_ALLOWED_OP", () => {
    const error = new ApiError('Not authorized to perform this action', {
      status: 403,
      code: 'NOT_ALLOWED_OP',
    });
    expect(errorReason(error)).toBe("Your account isn't allowed to do this.");
  });

  it("gives the API's reason for a 403 on a business rule", () => {
    const error = new ApiError('Virtual lab is not a course lab', {
      status: 403,
      code: 'NOT_ALLOWED_OP',
    });
    expect(errorReason(error)).toBe('Virtual lab is not a course lab');
  });
});

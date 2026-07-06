import { createHmac } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { verifyLaunchParams } from './launch';

import type { RawParams } from './launch';

const SECRET = 'test-hmac-secret';

// Mirror grading-service's signing contract exactly: HMAC-SHA256 over
// `token|assignment_id|virtual_lab_id|exp` (see grading-service app/launch.py / docs/system-design.md §1).
function sign(p: { token: string; assignment_id: string; virtual_lab_id: string; exp: string }) {
  return createHmac('sha256', SECRET)
    .update(`${p.token}|${p.assignment_id}|${p.virtual_lab_id}|${p.exp}`, 'utf8')
    .digest('hex');
}

function validRaw(overrides: Partial<Record<keyof RawParams, string>> = {}): RawParams {
  const base = {
    token: 'tok-123',
    assignment_id: 'rc_circuit_lab',
    virtual_lab_id: 'vlab-1',
    exp: String(Math.floor(Date.now() / 1000) + 600),
    ...overrides,
  };
  return { ...base, sig: sign(base) };
}

describe('verifyLaunchParams', () => {
  it('accepts a correctly signed assignment_id launch', () => {
    const result = verifyLaunchParams(validRaw(), SECRET);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.params.assignment_id).toBe('rc_circuit_lab');
      expect(result.params.token).toBe('tok-123');
    }
  });

  it('rejects a tampered signature as invalid', () => {
    expect(verifyLaunchParams({ ...validRaw(), sig: 'deadbeef' }, SECRET)).toEqual({
      ok: false,
      reason: 'invalid',
    });
  });

  it('rejects an altered field whose signature no longer matches', () => {
    // Sign for one assignment, then swap the value while keeping the old sig.
    const raw = { ...validRaw(), assignment_id: 'other_assignment' };
    expect(verifyLaunchParams(raw, SECRET)).toEqual({ ok: false, reason: 'invalid' });
  });

  it('rejects the wrong secret as invalid', () => {
    expect(verifyLaunchParams(validRaw(), 'different-secret')).toEqual({
      ok: false,
      reason: 'invalid',
    });
  });

  it('reports an expired (but validly signed) launch as expired', () => {
    const raw = validRaw({ exp: String(Math.floor(Date.now() / 1000) - 10) });
    expect(verifyLaunchParams(raw, SECRET)).toEqual({ ok: false, reason: 'expired' });
  });

  it('rejects a non-numeric exp before HMAC as invalid', () => {
    const raw = validRaw({ exp: 'abc' });
    expect(verifyLaunchParams(raw, SECRET)).toEqual({ ok: false, reason: 'invalid' });
  });

  it('rejects a launch missing assignment_id (e.g. a legacy exercise_id-only URL)', () => {
    const raw: RawParams = {
      token: 'tok-123',
      virtual_lab_id: 'vlab-1',
      exp: String(Math.floor(Date.now() / 1000) + 600),
      sig: 'anything',
    };
    expect(verifyLaunchParams(raw, SECRET)).toEqual({ ok: false, reason: 'invalid' });
  });
});

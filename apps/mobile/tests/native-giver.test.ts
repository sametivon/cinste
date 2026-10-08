import { describe, expect, it, vi } from 'vitest';
import { authorizationCodeFromParams, completeGiverConfirmation } from '@/lib/native-giver-confirmation';
import { NATIVE_GIVER_SIGNUP_URL, shapeNativeGiverSignupPayload, submitNativeGiverSignup } from '@/lib/native-giver';

describe('native Giver signup boundary', () => {
  it('shapes only the permitted signup fields', () => {
    expect(shapeNativeGiverSignupPayload({ email: ' giver@example.com ', password: 'password123', displayName: ' Sam ' })).toEqual({ email: 'giver@example.com', password: 'password123', displayName: 'Sam' });
    expect(Object.keys(shapeNativeGiverSignupPayload({ email: 'a@example.com', password: 'password123', displayName: ' ' }))).toEqual(['email', 'password']);
  });

  it('posts only to the fixed BFF and treats only 202 as confirmation-needed', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 202 }));
    expect(await submitNativeGiverSignup({ email: 'a@example.com', password: 'password123' })).toBe('confirmation_needed');
    expect(fetchMock).toHaveBeenCalledWith(NATIVE_GIVER_SIGNUP_URL, expect.objectContaining({ method: 'POST', body: JSON.stringify({ email: 'a@example.com', password: 'password123' }) }));
    fetchMock.mockResolvedValue(new Response('{}', { status: 409 }));
    expect(await submitNativeGiverSignup({ email: 'a@example.com', password: 'password123' })).toBe('unavailable');
    fetchMock.mockRestore();
  });
});

describe('fixed Giver confirmation', () => {
  it('accepts only an authorization code and rejects raw tokens or link overrides', () => {
    expect(authorizationCodeFromParams({ code: 'pkce-code' })).toBe('pkce-code');
    for (const params of [{ access_token: 'raw' }, { refresh_token: 'raw' }, { code: 'x', returnTo: '/admin' }, { code: 'x', workspace: 'giver' }, { code: 'x', arbitrary: 'value' }]) expect(authorizationCodeFromParams(params)).toBeNull();
  });

  it('revalidates the server-authoritative workspace after exchange', async () => {
    const revalidate = vi.fn(async () => undefined);
    const exchange = vi.fn(async () => ({ data: { session: { user: { id: 'user-1' } } }, error: null }));
    expect(await completeGiverConfirmation('pkce-code', exchange, revalidate)).toBe(true);
    expect(revalidate).toHaveBeenCalledWith('user-1');
  });
});

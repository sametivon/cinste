import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  redirect: vi.fn((path: string) => { throw new Error(`REDIRECT:${path}`); }),
  createClient: vi.fn(),
  adminDb: vi.fn(),
  activeOrganizationWorkspaces: vi.fn(),
  getWebLocale: vi.fn(async () => 'en'),
}));

vi.mock('next/navigation', () => ({ redirect: mocks.redirect }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createClient: mocks.createClient }));
vi.mock('@/lib/supabase/admin', () => ({ adminDb: mocks.adminDb }));
vi.mock('@/lib/organization-workspace', () => ({ activeOrganizationWorkspaces: mocks.activeOrganizationWorkspaces }));
vi.mock('@/lib/i18n/server', () => ({ getWebLocale: mocks.getWebLocale }));

import { login, signup, signupGiver } from '@/app/actions';

const userId = '00000000-0000-4000-8000-000000000123';
const grantToken = 'a'.repeat(64);

function form() {
  const value = new FormData();
  value.set('email', ' New.Giver@Example.COM ');
  value.set('password', 'correct-horse');
  value.set('displayName', 'New Giver');
  return value;
}

function client({ authenticated = false, session = true, role = 'giver' } = {}) {
  const signUp = vi.fn(async (_input: { options: { data: Record<string, string | undefined> } }) => ({
    data: {
      user: { id: userId },
      session: session ? { user: { id: userId } } : null,
    },
    error: null,
  }));
  const signOut = vi.fn(async () => ({ error: null }));
  return {
    auth: {
      getUser: vi.fn(async () => ({ data: { user: authenticated ? { id: userId } : null } })),
      signInWithPassword: vi.fn(async () => ({ data: { user: { id: userId } }, error: null })),
      signUp,
      signOut,
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({ maybeSingle: vi.fn(async () => ({ data: { role } })) })),
      })),
    })),
  };
}

function service(finalizedId: string | null = userId) {
  return {
    rpc: vi.fn(async (name: string) => name === 'issue_giver_provisioning_grant'
      ? { data: grantToken, error: null }
      : { data: finalizedId, error: null }),
  };
}

describe('dedicated Giver signup action', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.activeOrganizationWorkspaces.mockResolvedValue([]);
  });

  it('sends a new standard account to the Student app handoff', async () => {
    mocks.createClient.mockResolvedValue(client());
    const input = new FormData();
    input.set('email', 'student@example.com');
    input.set('password', 'correct-horse');
    input.set('displayName', 'Student');

    await expect(signup(input)).rejects.toThrow('REDIRECT:/student');
  });

  it('shows Student confirmation guidance when signup returns no session', async () => {
    mocks.createClient.mockResolvedValue(client({ session: false }));
    const input = new FormData();
    input.set('email', 'student@example.com');
    input.set('password', 'correct-horse');
    input.set('displayName', 'Student');

    await expect(signup(input)).rejects.toThrow('REDIRECT:/login?status=confirm-email&intent=student&returnTo=%2Fstudent');
  });

  it('keeps an authenticated existing account on its stored-role destination without issuing a grant', async () => {
    const db = client({ authenticated: true, role: 'student' });
    const privileged = service();
    mocks.createClient.mockResolvedValue(db);
    mocks.adminDb.mockReturnValue(privileged);

    await expect(signupGiver(form())).rejects.toThrow('REDIRECT:/student');
    expect(privileged.rpc).not.toHaveBeenCalled();
    expect(db.auth.signUp).not.toHaveBeenCalled();
  });

  it.each([
    ['giver', '/giver'],
    ['partner', '/partner'],
    ['admin', '/admin'],
  ])('preserves an existing %s account', async (role, destination) => {
    const db = client({ authenticated: true, role });
    const privileged = service();
    mocks.createClient.mockResolvedValue(db);
    mocks.adminDb.mockReturnValue(privileged);

    await expect(signupGiver(form())).rejects.toThrow(`REDIRECT:${destination}`);
    expect(privileged.rpc).not.toHaveBeenCalled();
    expect(db.auth.signUp).not.toHaveBeenCalled();
  });

  it('uses only normalized credentials and reserved proof metadata, then routes an immediate session as Giver', async () => {
    const db = client();
    const privileged = service();
    mocks.createClient.mockResolvedValue(db);
    mocks.adminDb.mockReturnValue(privileged);

    await expect(signupGiver(form())).rejects.toThrow('REDIRECT:/giver');
    expect(privileged.rpc).toHaveBeenNthCalledWith(1, 'issue_giver_provisioning_grant', {
      p_normalized_email: 'new.giver@example.com',
    });
    expect(db.auth.signUp).toHaveBeenCalledWith({
      email: 'new.giver@example.com',
      password: 'correct-horse',
      options: { emailRedirectTo: 'http://localhost:3000/auth/callback?next=%2Fgiver', data: { display_name: 'New Giver', cinste_giver_provisioning_token: grantToken } },
    });
    expect(db.auth.signUp.mock.calls[0][0].options.data).not.toHaveProperty('role');
    expect(privileged.rpc).toHaveBeenNthCalledWith(2, 'finalize_giver_provisioning_grant', { p_token: grantToken });
  });

  it('treats consumed grant state as authority when confirmation is required and no session is returned', async () => {
    const db = client({ session: false });
    mocks.createClient.mockResolvedValue(db);
    mocks.adminDb.mockReturnValue(service());

    await expect(signupGiver(form())).rejects.toThrow(/^REDIRECT:\/login\?status=confirm-email/);
    const destination = String(mocks.redirect.mock.calls.at(-1)?.[0]);
    expect(destination).toContain('intent=giver');
    expect(destination).toContain('returnTo=%2Fgiver');
    expect(destination).not.toContain(grantToken);
  });

  it('does not infer account creation from the Auth response when the grant was not consumed', async () => {
    const db = client();
    mocks.createClient.mockResolvedValue(db);
    mocks.adminDb.mockReturnValue(service(null));

    await expect(signupGiver(form())).rejects.toThrow(/^REDIRECT:\/login\?error=/);
    const destination = String(mocks.redirect.mock.calls.at(-1)?.[0]);
    expect(destination).toContain('intent=giver');
    expect(destination).not.toContain(grantToken);
  });

  it('ignores caller-supplied role and arbitrary fields', async () => {
    const input = form();
    input.set('role', 'admin');
    const db = client();
    const privileged = service();
    mocks.createClient.mockResolvedValue(db);
    mocks.adminDb.mockReturnValue(privileged);

    await expect(signupGiver(input)).rejects.toThrow('REDIRECT:/giver');
    expect(db.auth.signUp.mock.calls[0][0].options.data).not.toHaveProperty('role');
  });

  it('login with Giver intent follows the stored role without profile mutation', async () => {
    const db = client({ role: 'partner' });
    mocks.createClient.mockResolvedValue(db);
    const input = form();
    input.set('email', 'partner@example.com');
    input.set('intent', 'giver');
    input.set('returnTo', '/giver');

    await expect(login(input)).rejects.toThrow('REDIRECT:/partner');
    expect(db.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'partner@example.com',
      password: 'correct-horse',
    });
    expect(db.from).toHaveBeenCalledWith('profiles');
  });
});

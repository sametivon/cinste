export const FIXED_GIVER_CONFIRMATION_PATH = '/native/giver/confirm';
export type GiverConfirmationParams = Record<string, string | string[] | undefined>;

export function authorizationCodeFromParams(params: GiverConfirmationParams) {
  const code = params.code;
  if (Object.keys(params).some((key) => key !== 'code' && key !== 'state')) return null;
  if (params.state !== undefined && typeof params.state !== 'string') return null;
  if (typeof code !== 'string' || code.length < 1 || code.length > 4096) return null;
  return code;
}

export async function completeGiverConfirmation(
  code: string,
  exchange: (value: string) => Promise<{ data: { session: { user: { id: string } } | null }; error: unknown }>,
  revalidate: (userId: string) => Promise<unknown>,
) {
  const result = await exchange(code);
  if (result.error || !result.data.session) return false;
  await revalidate(result.data.session.user.id);
  return true;
}

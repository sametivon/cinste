// Prevent all Supabase client creation during script preflight tests.
export async function resolve(specifier, context, nextResolve) {
  if (specifier === '@supabase/supabase-js') {
    return {
      url: 'data:text/javascript,export function createClient() { throw new Error("QA_TEST_CLIENT_CREATED"); }',
      shortCircuit: true,
    };
  }
  return nextResolve(specifier, context);
}

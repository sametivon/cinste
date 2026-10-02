export type AppLifecycleState = 'active' | 'background' | 'inactive' | 'unknown' | 'extension';

// The app only refreshes protected student state after returning to the
// foreground. This keeps data current without background polling.
export function shouldRefreshOnForeground(nextState: AppLifecycleState, hasSession: boolean) {
  return hasSession && nextState === 'active';
}

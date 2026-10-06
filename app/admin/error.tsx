'use client';

export default function Error({ reset }: { reset: () => void }) {
  return <main className="shell operational-shell admin-v1-page py-10"><div className="empty-state error-state"><h1>Admin workspace could not be loaded.</h1><p>Refresh the authorized operational records and try again.</p><button className="btn" onClick={reset}>Retry</button></div></main>;
}

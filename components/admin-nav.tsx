import Link from 'next/link';

const items = [
  { href: '/admin', label: 'Overview' },
  { href: '/admin#verification', label: 'Student verification' },
  { href: '/admin/manage', label: 'Catalog & partners' },
  { href: '/admin/operations', label: 'Core operations' },
  { href: '/admin/impact', label: 'Impact & organizations' },
];

export function AdminNav({ current }: { current: string }) {
  return <nav className="admin-nav" aria-label="Admin workspace">
    {items.map((item) => <Link key={item.href} href={item.href} aria-current={current === item.href ? 'page' : undefined}>{item.label}</Link>)}
  </nav>;
}

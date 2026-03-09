'use client'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect, ReactNode } from 'react'

const NAV_ITEMS = [
  { href: '/admin/dashboard', icon: '📊', label: 'Dashboard' },
  { href: '/admin/sessions', icon: '🛒', label: 'Active Trolleys' },
  { href: '/admin/products', icon: '📦', label: 'Products' },
  { href: '/admin/inventory', icon: '🏪', label: 'Inventory' },
  { href: '/admin/analytics', icon: '📈', label: 'Analytics' },
  { href: '/admin/bills', icon: '🧾', label: 'Bill History' },
]

export default function AdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('adminToken')
      if (!token) router.replace('/admin/login')
    }
  }, [router])

  function logout() {
    localStorage.removeItem('adminToken')
    router.push('/admin/login')
  }

  return (
    <div className="page-container">
      <nav className="navbar">
        <Link href="/admin/dashboard" className="navbar-brand" style={{ textDecoration: 'none' }}>
          <div className="brand-icon">🛒</div>
          SmartTrolley <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: '0.85rem', marginLeft: '0.25rem' }}>Admin</span>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Link href="/" className="btn btn-ghost btn-sm">🏠 Site</Link>
          <button className="btn btn-outline btn-sm" onClick={logout}>Logout</button>
        </div>
      </nav>

      <div className="admin-layout">
        <aside className="sidebar">
          <p className="sidebar-section">Menu</p>
          {NAV_ITEMS.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-link ${pathname === item.href ? 'active' : ''}`}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </aside>
        <main className="main-content">{children}</main>
      </div>
    </div>
  )
}

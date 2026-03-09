'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

interface DashData {
  activeSessions: number
  checkoutSessions: number
  todayRevenue: number
  todayTransactions: number
  totalProducts: number
  lowStock: number
  recentSessions: { id: string; trolley_id: string; customer_name: string; customer_mobile: string; status: string; created_at: string }[]
}

function StatCard({ icon, label, value, sub, color }: { icon: string; label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="stat-card">
      <div className="stat-icon" style={{ background: color || 'var(--primary-light)' }}>
        <span>{icon}</span>
      </div>
      <p className="stat-label">{label}</p>
      <p className="stat-value">{value}</p>
      {sub && <p className="stat-sub">{sub}</p>}
    </div>
  )
}

export default function AdminDashboard() {
  const [data, setData] = useState<DashData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function fetchDashboard() {
    const token = localStorage.getItem('adminToken')
    try {
      const res = await fetch('/api/admin/dashboard', { headers: { 'x-admin-token': token || '' } })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setData(json.data)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboard()
    const interval = setInterval(fetchDashboard, 10000)
    return () => clearInterval(interval)
  }, [])

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px' }}><div className="spinner" /></div>

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Dashboard</h1>
          <p className="text-secondary text-sm">Live overview · Auto-refreshes every 10s</p>
        </div>
        <button className="btn btn-outline btn-sm" onClick={fetchDashboard}>🔄 Refresh</button>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>⚠️ {error}</div>}

      {data && (
        <>
          <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
            <StatCard icon="🛒" label="Active Trolleys" value={data.activeSessions} sub="Currently shopping" color="#dbeafe" />
            <StatCard icon="💳" label="Awaiting Payment" value={data.checkoutSessions} sub="At checkout" color="#ede9fe" />
            <StatCard icon="₹" label="Today's Revenue" value={`₹${data.todayRevenue.toFixed(2)}`} sub={`${data.todayTransactions} transactions`} color="#dcfce7" />
            <StatCard icon="📦" label="Total Products" value={data.totalProducts} sub={`${data.lowStock} low stock`} color="#fef3c7" />
          </div>

          {data.lowStock > 0 && (
            <div className="alert alert-warn" style={{ marginBottom: '1.5rem' }}>
              ⚠️ <strong>{data.lowStock} products</strong> are running low on stock.{' '}
              <Link href="/admin/inventory" style={{ color: 'inherit', textDecoration: 'underline' }}>View Inventory →</Link>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
            {/* Recent Sessions */}
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">Recent Sessions</h2>
                <Link href="/admin/sessions" className="btn btn-ghost btn-sm">View All →</Link>
              </div>
              {data.recentSessions.length === 0 ? (
                <p className="text-muted text-sm" style={{ textAlign: 'center', padding: '2rem' }}>No sessions yet</p>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Customer</th>
                        <th>Mobile</th>
                        <th>Trolley</th>
                        <th>Status</th>
                        <th>Started</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.recentSessions.map(s => (
                        <tr key={s.id}>
                          <td><strong>{s.customer_name}</strong></td>
                          <td className="text-secondary">{s.customer_mobile}</td>
                          <td><span className="badge badge-active">{s.trolley_id}</span></td>
                          <td>
                            <span className={`badge badge-${s.status === 'active' ? 'active' : s.status === 'paid' ? 'paid' : s.status === 'checkout' ? 'checkout' : 'pending'}`}>
                              {s.status}
                            </span>
                          </td>
                          <td className="text-secondary text-xs">{new Date(s.created_at).toLocaleTimeString('en-IN')}</td>
                          <td>
                            <Link href={`/customer/billing/${s.id}`} className="btn btn-ghost btn-sm" target="_blank">View →</Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Quick Links */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem' }}>
              {[
                { href: '/admin/products', icon: '📦', label: 'Manage Products', color: 'var(--primary-light)' },
                { href: '/admin/inventory', icon: '🏪', label: 'Check Inventory', color: '#dcfce7' },
                { href: '/admin/analytics', icon: '📈', label: 'View Analytics', color: '#ede9fe' },
                { href: '/admin/bills', icon: '🧾', label: 'Bill History', color: '#fef3c7' },
              ].map(item => (
                <Link key={item.href} href={item.href} style={{ textDecoration: 'none' }}>
                  <div className="card" style={{ background: item.color, border: 'none', textAlign: 'center', cursor: 'pointer', transition: 'transform 0.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-2px)')}
                    onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
                  >
                    <div style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>{item.icon}</div>
                    <p style={{ fontWeight: 600, fontSize: '0.875rem' }}>{item.label}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

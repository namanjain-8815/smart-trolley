'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Session {
  id: string
  trolley_id: string
  customer_name: string
  customer_mobile: string
  status: string
  current_weight: number | null
  created_at: string
  completed_at: string | null
  payments: { amount: number; status: string; paid_at: string }[] | null
}

export default function SessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('active')

  function getToken() { return localStorage.getItem('adminToken') || '' }

  async function fetchSessions(status: string) {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/sessions?status=${status}`, { headers: { 'x-admin-token': getToken() } })
      const json = await res.json()
      if (res.ok) setSessions(json.data)
      else setError(json.error)
    } catch { setError('Failed to load sessions') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchSessions(filter) }, [filter])

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Active Trolleys</h1>
          <p className="text-secondary text-sm">Live view of all shopping sessions</p>
        </div>
        <button className="btn btn-outline btn-sm" onClick={() => fetchSessions(filter)}>🔄 Refresh</button>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>⚠️ {error}</div>}

      {/* Filter */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
        {[
          { key: 'active', label: '🛒 Active' },
          { key: 'checkout', label: '💳 Checkout' },
          { key: 'paid', label: '✅ Paid' },
          { key: 'all', label: 'All Sessions' },
        ].map(tab => (
          <button key={tab.key} className={`btn btn-sm ${filter === tab.key ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFilter(tab.key)}>
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}><div className="spinner" style={{ margin: 'auto' }} /></div>
      ) : sessions.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🛒</div>
          <p>No {filter === 'all' ? '' : filter} sessions found</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Trolley</th>
                <th>Customer</th>
                <th>Mobile</th>
                <th>Status</th>
                <th>Weight (g)</th>
                <th>Amount</th>
                <th>Started</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map(s => {
                const payment = Array.isArray(s.payments) ? s.payments[0] : null
                return (
                  <tr key={s.id}>
                    <td><span className="badge badge-active">{s.trolley_id}</span></td>
                    <td><strong>{s.customer_name}</strong></td>
                    <td className="text-secondary">{s.customer_mobile}</td>
                    <td>
                      <span className={`badge badge-${s.status === 'active' ? 'active' : s.status === 'paid' ? 'paid' : s.status === 'checkout' ? 'checkout' : 'pending'}`}>
                        {s.status}
                      </span>
                    </td>
                    <td>{s.current_weight != null ? `${s.current_weight}g` : <span className="text-muted">—</span>}</td>
                    <td>{payment ? `₹${payment.amount?.toFixed(2)}` : <span className="text-muted">—</span>}</td>
                    <td className="text-xs text-secondary">{new Date(s.created_at).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })}</td>
                    <td>
                      <Link href={`/customer/billing/${s.id}`} target="_blank" className="btn btn-outline btn-sm">View Bill →</Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

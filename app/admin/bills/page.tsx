'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

interface BillSession {
  id: string
  trolley_id: string
  customer_name: string
  customer_mobile: string
  status: string
  created_at: string
  completed_at: string | null
  payments: { amount: number; status: string; upi_txn_id: string | null; paid_at: string | null }[] | null
  scanned_items: { id: string }[]
}

export default function BillsPage() {
  const [bills, setBills] = useState<BillSession[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  function getToken() { return localStorage.getItem('adminToken') || '' }

  useEffect(() => {
    fetch('/api/admin/bills', { headers: { 'x-admin-token': getToken() } })
      .then(r => r.json())
      .then(json => { if (json.success) setBills(json.data); else setError(json.error) })
      .catch(() => setError('Failed to load bills'))
      .finally(() => setLoading(false))
  }, [])

  const filtered = bills.filter(b =>
    b.customer_name.toLowerCase().includes(search.toLowerCase()) ||
    b.customer_mobile.includes(search) ||
    b.trolley_id.toLowerCase().includes(search.toLowerCase())
  )

  const totalRevenue = bills.filter(b => b.status === 'paid')
    .reduce((s, b) => {
      const p = Array.isArray(b.payments) ? b.payments[0] : null
      return s + (p?.amount || 0)
    }, 0)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Bill History</h1>
          <p className="text-secondary text-sm">{bills.length} total sessions · ₹{totalRevenue.toFixed(2)} total revenue</p>
        </div>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>⚠️ {error}</div>}

      <div style={{ marginBottom: '1rem' }}>
        <input
          className="form-input"
          style={{ maxWidth: '320px' }}
          placeholder="🔍 Search by name, mobile, or trolley..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}><div className="spinner" style={{ margin: 'auto' }} /></div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Session ID</th>
                <th>Customer</th>
                <th>Mobile</th>
                <th>Trolley</th>
                <th>Items</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Date</th>
                <th>Receipt</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(b => {
                const payment = Array.isArray(b.payments) ? b.payments[0] : null
                return (
                  <tr key={b.id}>
                    <td className="text-xs text-muted"><code>{b.id.slice(0, 8)}...</code></td>
                    <td><strong>{b.customer_name}</strong></td>
                    <td className="text-secondary">{b.customer_mobile}</td>
                    <td><span className="badge badge-active">{b.trolley_id}</span></td>
                    <td>{b.scanned_items?.length || 0} items</td>
                    <td>
                      {payment ? (
                        <strong>₹{payment.amount?.toFixed(2)}</strong>
                      ) : <span className="text-muted">—</span>}
                    </td>
                    <td>
                      <span className={`badge badge-${b.status === 'paid' ? 'paid' : b.status === 'active' ? 'active' : b.status === 'checkout' ? 'checkout' : 'pending'}`}>
                        {b.status}
                      </span>
                      {payment?.upi_txn_id && (
                        <p className="text-xs text-muted" style={{ marginTop: '0.2rem' }}>TXN: {payment.upi_txn_id}</p>
                      )}
                    </td>
                    <td className="text-xs text-secondary">
                      {new Date(b.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}
                    </td>
                    <td>
                      {b.status === 'paid' ? (
                        <Link href={`/customer/receipt/${b.id}`} target="_blank" className="btn btn-outline btn-sm">🧾 View</Link>
                      ) : (
                        <Link href={`/customer/billing/${b.id}`} target="_blank" className="btn btn-ghost btn-sm">Bill →</Link>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <p className="text-muted text-sm" style={{ textAlign: 'center', padding: '2rem' }}>No bills match your search</p>
          )}
        </div>
      )}
    </div>
  )
}

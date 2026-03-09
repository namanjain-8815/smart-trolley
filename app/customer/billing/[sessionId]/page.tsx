'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'

interface Product { name: string; barcode: string }
interface ScannedItem {
  id: string
  quantity: number
  unit_price: number
  gst_percent: number
  discount_percent: number
  gst_amount: number
  discount_amount: number
  subtotal: number
  verified: boolean
  products: Product
}
interface Session {
  id: string
  trolley_id: string
  customer_name: string
  customer_mobile: string
  status: string
}
interface Totals {
  subtotal: number
  totalDiscount: number
  totalGst: number
  grandTotal: number
}

export default function BillingPage() {
  const params = useParams()
  const sessionId = params.sessionId as string
  const router = useRouter()

  const [session, setSession] = useState<Session | null>(null)
  const [items, setItems] = useState<ScannedItem[]>([])
  const [totals, setTotals] = useState<Totals>({ subtotal: 0, totalDiscount: 0, totalGst: 0, grandTotal: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [removing, setRemoving] = useState<string | null>(null)
  const [lastAdded, setLastAdded] = useState<string | null>(null)
  const prevItemsRef = useRef<ScannedItem[]>([])

  const fetchBill = useCallback(async () => {
    try {
      const res = await fetch(`/api/bill/${sessionId}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setSession(json.data.session)
      setTotals(json.data.totals)

      // Detect newly added item
      const prev = prevItemsRef.current
      const curr: ScannedItem[] = json.data.items
      if (curr.length > prev.length) {
        const newest = curr[curr.length - 1]
        setLastAdded(newest.id)
        setTimeout(() => setLastAdded(null), 3000)
      }
      prevItemsRef.current = curr
      setItems(curr)

      // Redirect if already paid
      if (json.data.session.status === 'paid') {
        router.push(`/customer/receipt/${sessionId}`)
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load bill')
    } finally {
      setLoading(false)
    }
  }, [sessionId, router])

  useEffect(() => {
    fetchBill()
    const interval = setInterval(fetchBill, 3000)
    return () => clearInterval(interval)
  }, [fetchBill])

  async function removeItem(itemId: string) {
    if (!confirm('Remove this item from your cart?')) return
    setRemoving(itemId)
    try {
      const res = await fetch(`/api/bill/${sessionId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_id: itemId }),
      })
      if (res.ok) fetchBill()
    } finally {
      setRemoving(null)
    }
  }

  async function goToPayment() {
    router.push(`/customer/payment/${sessionId}`)
  }

  if (loading) return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}><div className="spinner" /><p className="text-muted mt-4">Loading your bill...</p></div>
    </div>
  )

  return (
    <div className="page-container">
      {/* Navbar */}
      <nav className="navbar">
        <div className="navbar-brand"><div className="brand-icon">🛒</div>SmartTrolley</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {session && (
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontWeight: 600, fontSize: '0.9rem' }}>{session.customer_name}</p>
              <p className="text-xs text-muted">Trolley: {session.trolley_id} · {session.customer_mobile}</p>
            </div>
          )}
          <div className="badge badge-active">● LIVE</div>
        </div>
      </nav>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '1.5rem', width: '100%' }}>
        {error && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>⚠️ {error}</div>}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '1.5rem' }}>
          {/* Items List */}
          <div>
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">🛒 Cart ({items.length} items)</h2>
                <span className="text-xs text-muted">Auto-updates every 3s</span>
              </div>

              {items.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📦</div>
                  <p className="font-semibold">No items scanned yet</p>
                  <p className="text-sm mt-1">Start scanning products with your trolley!</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                  {items.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        padding: '1rem',
                        borderTop: '1px solid var(--border)',
                        background: lastAdded === item.id ? '#f0fdf4' : 'transparent',
                        transition: 'background 0.5s ease',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '1rem',
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                          <p className="font-semibold" style={{ fontSize: '0.9rem' }}>{item.products?.name}</p>
                          {item.verified && <span className="badge badge-ok" style={{ fontSize: '0.65rem' }}>✓ Verified</span>}
                          {!item.verified && <span className="badge badge-pending" style={{ fontSize: '0.65rem' }}>⏳ Pending</span>}
                        </div>
                        <p className="text-xs text-muted">
                          ₹{item.unit_price.toFixed(2)} × {item.quantity}
                          {item.discount_percent > 0 && ` · ${item.discount_percent}% off`}
                          {item.gst_percent > 0 && ` · GST ${item.gst_percent}%`}
                        </p>
                        {item.discount_amount > 0 && (
                          <p className="text-xs text-success">You save ₹{item.discount_amount.toFixed(2)}</p>
                        )}
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p className="font-bold" style={{ fontSize: '1rem' }}>₹{item.subtotal.toFixed(2)}</p>
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ color: 'var(--danger)', marginTop: '0.25rem', fontSize: '0.75rem' }}
                          onClick={() => removeItem(item.id)}
                          disabled={removing === item.id}
                        >
                          {removing === item.id ? '...' : '✕ Remove'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Bill Summary */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="card">
              <h3 className="card-title" style={{ marginBottom: '1rem' }}>Bill Summary</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="text-secondary text-sm">Subtotal</span>
                  <span className="font-semibold text-sm">₹{totals.subtotal.toFixed(2)}</span>
                </div>
                {totals.totalDiscount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="text-secondary text-sm">Discount</span>
                    <span className="text-success font-semibold text-sm">−₹{totals.totalDiscount.toFixed(2)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="text-secondary text-sm">GST</span>
                  <span className="font-semibold text-sm">₹{totals.totalGst.toFixed(2)}</span>
                </div>
                <div style={{ height: '1px', background: 'var(--border)', margin: '0.25rem 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="font-bold">Total Payable</span>
                  <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--primary)' }}>₹{totals.grandTotal.toFixed(2)}</span>
                </div>
              </div>

              <button
                className="btn btn-success btn-lg w-full"
                style={{ marginTop: '1.25rem' }}
                onClick={goToPayment}
                disabled={items.length === 0}
              >
                💳 Proceed to Pay
              </button>
              <p className="text-xs text-muted" style={{ textAlign: 'center', marginTop: '0.5rem' }}>Pay via UPI · Google Pay · PhonePe</p>
            </div>

            <div className="card" style={{ background: 'var(--primary-light)', border: '1px solid #bfdbfe' }}>
              <p className="text-sm" style={{ color: 'var(--primary-dark)', lineHeight: 1.6 }}>
                <strong>⚡ Scanning?</strong> Products from your trolley barcode scanner appear here automatically every 3 seconds.
              </p>
            </div>

            {session && (
              <div className="card">
                <p className="text-xs text-muted" style={{ lineHeight: 1.8 }}>
                  <strong>Session:</strong> {session.id.slice(0, 8)}...<br />
                  <strong>Trolley:</strong> {session.trolley_id}<br />
                  <strong>Status:</strong> <span className="badge badge-active">{session.status}</span>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

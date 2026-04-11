'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'

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
type ScanMode = 'ADD' | 'REMOVE'
interface Toast {
  id: number
  message: string
  type: 'success' | 'danger' | 'warning'
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
  const [lastChanged, setLastChanged] = useState<string | null>(null)
  const [mode, setMode] = useState<ScanMode>('ADD')
  const [toasts, setToasts] = useState<Toast[]>([])

  const prevItemsRef   = useRef<ScannedItem[]>([])
  const toastCountRef  = useRef(0)
  const trolleyIdRef   = useRef<string | null>(null)
  const isFirstFetch   = useRef(true)
  const prevModeRef    = useRef<ScanMode>('ADD')

  // ── Toast helper ──────────────────────────────────────────────────────────
  const showToast = useCallback((message: string, type: Toast['type']) => {
    const id = ++toastCountRef.current
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000)
  }, [])

  // ── Highlight a cart row briefly ──────────────────────────────────────────
  const flashRow = useCallback((id: string) => {
    setLastChanged(id)
    setTimeout(() => setLastChanged(prev => prev === id ? null : prev), 2500)
  }, [])

  // ── Mode polling (every 2 s) ──────────────────────────────────────────────
  const fetchMode = useCallback(async (trolleyId: string) => {
    try {
      const res  = await fetch(`/api/mode?trolley_id=${encodeURIComponent(trolleyId)}`)
      const json = await res.json()
      if (!res.ok || !json.data?.mode) return

      const newMode: ScanMode = json.data.mode
      setMode(prev => {
        if (prev !== newMode) {
          if (newMode === 'REMOVE') showToast('🔴 Switched to REMOVE mode', 'danger')
          else                      showToast('🟢 Switched to ADD mode', 'success')
          prevModeRef.current = newMode
        }
        return newMode
      })
    } catch { /* ignore polling errors */ }
  }, [showToast])

  // ── Bill polling (every 3 s) ──────────────────────────────────────────────
  const fetchBill = useCallback(async () => {
    try {
      const res  = await fetch(`/api/bill/${sessionId}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)

      const newSession: Session = json.data.session
      setSession(newSession)
      setTotals(json.data.totals)

      if (newSession?.trolley_id) trolleyIdRef.current = newSession.trolley_id

      const prev: ScannedItem[] = prevItemsRef.current
      const curr: ScannedItem[] = json.data.items

      // Diff items to generate toast feedback (skip on very first load)
      if (!isFirstFetch.current) {
        const prevMap = new Map(prev.map(i => [i.id, i]))
        const currMap = new Map(curr.map(i => [i.id, i]))

        // Fully removed items
        for (const [id, item] of prevMap) {
          if (!currMap.has(id)) {
            showToast(`🗑️ Removed: ${item.products?.name}`, 'danger')
          }
        }

        // Added / qty changed
        for (const [id, item] of currMap) {
          const prevItem = prevMap.get(id)
          if (!prevItem) {
            showToast(`✅ Added: ${item.products?.name}`, 'success')
            flashRow(id)
          } else if (item.quantity > prevItem.quantity) {
            showToast(`✅ Added: ${item.products?.name} (×${item.quantity})`, 'success')
            flashRow(id)
          } else if (item.quantity < prevItem.quantity) {
            showToast(`🗑️ ${item.products?.name}: ×${prevItem.quantity} → ×${item.quantity}`, 'warning')
            flashRow(id)
          }
        }
      }

      isFirstFetch.current   = false
      prevItemsRef.current   = curr
      setItems(curr)

      if (newSession.status === 'paid') router.push(`/customer/receipt/${sessionId}`)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load bill')
    } finally {
      setLoading(false)
    }
  }, [sessionId, router, showToast, flashRow])

  useEffect(() => {
    fetchBill()
    const id = setInterval(fetchBill, 3000)
    return () => clearInterval(id)
  }, [fetchBill])

  useEffect(() => {
    const id = setInterval(() => {
      if (trolleyIdRef.current) fetchMode(trolleyIdRef.current)
    }, 2000)
    return () => clearInterval(id)
  }, [fetchMode])

  // ── Manual remove via UI "✕ Remove" button ────────────────────────────────
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

  if (loading) return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div className="spinner" />
        <p className="text-muted mt-4">Loading your bill...</p>
      </div>
    </div>
  )

  const isAdd = mode === 'ADD'

  return (
    <div className="page-container">

      {/* ── Toast stack ─────────────────────────────────────────────────── */}
      <div className="toast-container" aria-live="polite">
        {toasts.map(t => (
          <div key={t.id} className={`toast toast-${t.type}`}>{t.message}</div>
        ))}
      </div>

      {/* ── Navbar ──────────────────────────────────────────────────────── */}
      <nav className="navbar">
        <div className="navbar-brand">
          <div className="brand-icon">🛒</div>
          SmartTrolley
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>

          {/* Mode pill */}
          <div className={`mode-pill ${isAdd ? 'mode-pill-add' : 'mode-pill-remove'}`}>
            <span className="mode-pill-dot" />
            {isAdd ? '➕ ADD MODE' : '🗑️ REMOVE MODE'}
          </div>

          {session && (
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontWeight: 600, fontSize: '0.9rem' }}>{session.customer_name}</p>
              <p className="text-xs text-muted">Trolley: {session.trolley_id} · {session.customer_mobile}</p>
            </div>
          )}
          <div className="badge badge-active">● LIVE</div>
        </div>
      </nav>

      {/* ── Mode banner ─────────────────────────────────────────────────── */}
      <div className={`mode-banner ${isAdd ? 'mode-banner-add' : 'mode-banner-remove'}`}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
          <span style={{ fontSize: '1.5rem' }}>{isAdd ? '➕' : '🗑️'}</span>
          <div>
            <p className="mode-banner-label">SCAN MODE</p>
            <p className="mode-banner-value">
              {isAdd
                ? 'ADD MODE — Scanning adds items to your cart'
                : 'REMOVE MODE — Scanning removes items from your cart'}
            </p>
          </div>
        </div>
        <p className="mode-banner-hint">
          {isAdd
            ? 'Scan the REMOVE barcode to switch to remove mode'
            : 'Scan the ADD (Checkout) barcode to switch back to add mode'}
        </p>
      </div>

      {/* ── Main content ────────────────────────────────────────────────── */}
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '1.5rem', width: '100%' }}>
        {error && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>⚠️ {error}</div>}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '1.5rem' }}>

          {/* ── Cart items ────────────────────────────────────────────── */}
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
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {items.map(item => {
                    const highlighted = lastChanged === item.id
                    return (
                      <div
                        key={item.id}
                        style={{
                          padding: '1rem',
                          borderTop: '1px solid var(--border)',
                          background: highlighted
                            ? (isAdd ? '#f0fdf4' : '#fff1f2')
                            : 'transparent',
                          transition: 'background 0.5s ease',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '1rem',
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                            <p className="font-semibold" style={{ fontSize: '0.9rem' }}>{item.products?.name}</p>
                            {item.verified
                              ? <span className="badge badge-ok"    style={{ fontSize: '0.65rem' }}>✓ Verified</span>
                              : <span className="badge badge-pending" style={{ fontSize: '0.65rem' }}>⏳ Pending</span>}
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
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ── Sidebar ───────────────────────────────────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

            {/* Bill summary */}
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
                  <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--primary)' }}>
                    ₹{totals.grandTotal.toFixed(2)}
                  </span>
                </div>
              </div>
              <button
                className="btn btn-success btn-lg w-full"
                style={{ marginTop: '1.25rem' }}
                onClick={() => router.push(`/customer/payment/${sessionId}`)}
                disabled={items.length === 0}
              >
                💳 Proceed to Pay
              </button>
              <p className="text-xs text-muted" style={{ textAlign: 'center', marginTop: '0.5rem' }}>
                Pay via UPI · Google Pay · PhonePe
              </p>
            </div>

            {/* Mode help card */}
            <div className={`card mode-help ${isAdd ? 'mode-help-add' : 'mode-help-remove'}`}>
              <p style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: '0.4rem' }}>
                {isAdd ? '➕ ADD mode active' : '🗑️ REMOVE mode active'}
              </p>
              <p style={{ fontSize: '0.8rem', lineHeight: 1.6, opacity: 0.85 }}>
                {isAdd
                  ? 'Scan any product barcode to add it to the cart. Scan the REMOVE barcode to switch modes.'
                  : 'Scan any product barcode to remove one unit from the cart. Scan the ADD (Checkout) barcode to switch modes.'}
              </p>
            </div>

            {/* Session info */}
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

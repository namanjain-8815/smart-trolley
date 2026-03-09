'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

interface Product { name: string; barcode: string }
interface ScannedItem {
  id: string
  quantity: number
  unit_price: number
  gst_amount: number
  discount_amount: number
  subtotal: number
  products: Product
}
interface Session { trolley_id: string; customer_name: string; customer_mobile: string; created_at: string; completed_at: string }
interface Payment { amount: number; upi_txn_id: string; paid_at: string }

export default function ReceiptPage() {
  const params = useParams()
  const sessionId = params.sessionId as string
  const [session, setSession] = useState<Session | null>(null)
  const [items, setItems] = useState<ScannedItem[]>([])
  const [payment, setPayment] = useState<Payment | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`/api/receipt/${sessionId}`)
      .then(r => r.json())
      .then(json => {
        if (!json.success) throw new Error(json.error)
        setSession(json.data.session)
        setItems(json.data.items)
        setPayment(json.data.payment)
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed to load receipt'))
      .finally(() => setLoading(false))
  }, [sessionId])

  if (loading) return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="spinner" />
    </div>
  )

  if (error || !session) return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="alert alert-error">{error || 'Receipt not found'}</div>
    </div>
  )

  const subtotal = items.reduce((s, i) => s + i.unit_price * i.quantity, 0)
  const discount = items.reduce((s, i) => s + i.discount_amount, 0)
  const gst = items.reduce((s, i) => s + i.gst_amount, 0)

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--surface-2)', padding: '1.5rem' }}>
      <div style={{ maxWidth: '520px', margin: '0 auto' }}>
        {/* Receipt */}
        <div className="card" id="receipt" style={{ fontFamily: 'monospace' }}>
          {/* Header */}
          <div style={{ textAlign: 'center', borderBottom: '2px dashed var(--border)', paddingBottom: '1rem', marginBottom: '1rem' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🏪</div>
            <h1 style={{ fontWeight: 800, fontSize: '1.25rem', fontFamily: 'Inter, sans-serif' }}>SmartStore</h1>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Smart Trolley Self-Checkout</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>GSTIN: 27AABCS1429B1ZB</p>
          </div>

          {/* Customer Info */}
          <div style={{ marginBottom: '1rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            <p><strong>Customer:</strong> {session.customer_name}</p>
            <p><strong>Mobile:</strong> {session.customer_mobile}</p>
            <p><strong>Trolley:</strong> {session.trolley_id}</p>
            <p><strong>Date:</strong> {new Date(payment?.paid_at || session.completed_at).toLocaleString('en-IN')}</p>
            <p><strong>Receipt No:</strong> {sessionId.slice(0, 8).toUpperCase()}</p>
          </div>

          {/* Items */}
          <div style={{ borderTop: '1px dashed var(--border)', borderBottom: '1px dashed var(--border)', padding: '0.75rem 0', marginBottom: '0.75rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.25rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
              <span>ITEM</span><span style={{ textAlign: 'right' }}>TOTAL</span>
            </div>
            {items.map(item => (
              <div key={item.id} style={{ marginBottom: '0.5rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', fontSize: '0.85rem' }}>
                  <span style={{ fontWeight: 600 }}>{item.products?.name}</span>
                  <span style={{ textAlign: 'right', fontWeight: 600 }}>₹{item.subtotal.toFixed(2)}</span>
                </div>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  ₹{item.unit_price.toFixed(2)} × {item.quantity}
                  {item.discount_amount > 0 && ` | Disc: -₹${item.discount_amount.toFixed(2)}`}
                  {item.gst_amount > 0 && ` | GST: +₹${item.gst_amount.toFixed(2)}`}
                </p>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div style={{ fontSize: '0.85rem' }}>
            {((): { label: string; value: string }[] => {
              const rows: { label: string; value: string }[] = [
                { label: 'Subtotal', value: `₹${subtotal.toFixed(2)}` },
              ]
              if (discount > 0) rows.push({ label: 'Discount', value: `-₹${discount.toFixed(2)}` })
              rows.push({ label: 'GST', value: `₹${gst.toFixed(2)}` })
              return rows
            })().map(({ label, value }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem', color: 'var(--text-secondary)' }}>
                <span>{label}</span><span>{value}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1.1rem', borderTop: '2px solid var(--border)', marginTop: '0.5rem', paddingTop: '0.5rem' }}>
              <span>TOTAL PAID</span>
              <span style={{ color: 'var(--primary)' }}>₹{payment?.amount?.toFixed(2)}</span>
            </div>
          </div>

          {/* Payment Info */}
          <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'var(--accent-light)', borderRadius: '0.5rem', textAlign: 'center' }}>
            <p style={{ fontWeight: 700, color: '#166534', fontSize: '0.9rem' }}>✅ PAID via UPI</p>
            {payment?.upi_txn_id && (
              <p style={{ fontSize: '0.75rem', color: '#166534' }}>TXN: {payment.upi_txn_id}</p>
            )}
          </div>

          <div style={{ textAlign: 'center', marginTop: '1rem', borderTop: '2px dashed var(--border)', paddingTop: '1rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            <p>Thank you for shopping at SmartStore!</p>
            <p>Powered by SmartTrolley System</p>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '1rem', marginTop: '1.25rem' }}>
          <button className="btn btn-outline w-full" onClick={() => window.print()}>🖨️ Print Receipt</button>
          <Link href="/" className="btn btn-primary w-full">🛒 Shop Again</Link>
        </div>
      </div>
    </div>
  )
}

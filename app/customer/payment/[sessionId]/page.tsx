'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'

interface Totals { subtotal: number; totalDiscount: number; totalGst: number; grandTotal: number }

export default function PaymentPage() {
  const params = useParams()
  const sessionId = params.sessionId as string
  const router = useRouter()

  const [totals, setTotals] = useState<Totals | null>(null)
  const [upiLink, setUpiLink] = useState('')
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [txnId, setTxnId] = useState('')
  const [loading, setLoading] = useState(true)
  const [paying, setPaying] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const generatedRef = useRef(false)

  const generatePayment = useCallback(async () => {
    if (generatedRef.current) return
    generatedRef.current = true
    try {
      const res = await fetch('/api/payment/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId }),
      })
      const json = await res.json()
      if (!res.ok) {
        // If already in checkout, just get the bill
        if (json.error?.includes('already')) {
          const billRes = await fetch(`/api/bill/${sessionId}`)
          const billJson = await billRes.json()
          if (billRes.ok) {
            setTotals(billJson.data.totals)
            setUpiLink(billJson.data.upiLink)
            await generateQR(billJson.data.upiLink)
          }
          return
        }
        throw new Error(json.error)
      }
      setTotals(json.data.totals)
      setUpiLink(json.data.upiLink)
      await generateQR(json.data.upiLink)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to generate payment')
    } finally {
      setLoading(false)
    }
  }, [sessionId])

  async function generateQR(link: string) {
    try {
      const QRCode = (await import('qrcode')).default
      const url = await QRCode.toDataURL(link, {
        width: 280,
        margin: 2,
        color: { dark: '#0f172a', light: '#ffffff' },
      })
      setQrDataUrl(url)
    } catch {
      // QR generation failed, UPI link still works
    }
  }

  useEffect(() => { generatePayment() }, [generatePayment])

  async function confirmPayment() {
    setPaying(true)
    setError('')
    try {
      const res = await fetch('/api/payment/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, upi_txn_id: txnId }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setSuccess(true)
      setTimeout(() => router.push(`/customer/receipt/${sessionId}`), 2000)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Payment confirmation failed')
    } finally {
      setPaying(false)
    }
  }

  if (loading) return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div className="spinner" />
        <p className="text-muted mt-4">Generating your payment QR code...</p>
      </div>
    </div>
  )

  if (success) return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--accent-light)' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '5rem', marginBottom: '1rem' }}>✅</div>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#166534', marginBottom: '0.5rem' }}>Payment Confirmed!</h2>
        <p style={{ color: '#166534' }}>Redirecting to your receipt...</p>
      </div>
    </div>
  )

  return (
    <div className="page-container" style={{ background: 'var(--surface-2)', minHeight: '100dvh' }}>
      <nav className="navbar">
        <div className="navbar-brand"><div className="brand-icon">🛒</div>SmartTrolley</div>
        <span className="badge badge-checkout">💳 Payment</span>
      </nav>

      <div style={{ maxWidth: '520px', margin: '2rem auto', padding: '1rem' }}>

        {error && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>⚠️ {error}</div>}

        {/* Bill Summary */}
        {totals && (
          <div className="card" style={{ marginBottom: '1.25rem', textAlign: 'center' }}>
            <p className="text-muted text-sm" style={{ marginBottom: '0.25rem' }}>Amount to Pay</p>
            <p style={{ fontSize: '3rem', fontWeight: 800, color: 'var(--primary)', lineHeight: 1 }}>
              ₹{totals.grandTotal.toFixed(2)}
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', marginTop: '0.875rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              <span>Subtotal: ₹{totals.subtotal.toFixed(2)}</span>
              <span>GST: ₹{totals.totalGst.toFixed(2)}</span>
              {totals.totalDiscount > 0 && <span className="text-success">Saved: ₹{totals.totalDiscount.toFixed(2)}</span>}
            </div>
          </div>
        )}

        {/* QR Code */}
        <div className="card" style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.25rem' }}>Scan UPI QR Code</h2>
          <p className="text-sm text-secondary" style={{ marginBottom: '1.25rem' }}>Use Google Pay, PhonePe, Paytm or BHIM</p>

          {qrDataUrl ? (
            <div style={{ display: 'inline-block', padding: '1rem', border: '2px solid var(--border)', borderRadius: '0.75rem', background: '#fff' }}>
              <img src={qrDataUrl} alt="UPI Payment QR Code" style={{ width: '240px', height: '240px', display: 'block' }} />
            </div>
          ) : (
            <div style={{ width: '240px', height: '240px', background: 'var(--surface-3)', border: '2px dashed var(--border)', borderRadius: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', flexDirection: 'column', gap: '0.5rem' }}>
              <span style={{ fontSize: '2rem' }}>📱</span>
              <p className="text-sm text-muted">QR Code</p>
            </div>
          )}

          <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'var(--surface-3)', borderRadius: '0.5rem' }}>
            <p className="text-xs text-muted" style={{ wordBreak: 'break-all', lineHeight: 1.5 }}>
              <strong>UPI Link:</strong> {upiLink}
            </p>
          </div>

          {/* Pay Now Button */}
          {upiLink && (
            <a
              href={upiLink}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.6rem',
                marginTop: '1.25rem',
                padding: '0.9rem 1.5rem',
                background: 'linear-gradient(135deg, #6d28d9, #4f46e5)',
                color: '#fff',
                borderRadius: '0.75rem',
                fontWeight: 700,
                fontSize: '1.05rem',
                textDecoration: 'none',
                boxShadow: '0 4px 15px rgba(109,40,217,0.35)',
                transition: 'transform 0.15s, box-shadow 0.15s',
                letterSpacing: '0.02em',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(-2px)'
                ;(e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 6px 20px rgba(109,40,217,0.5)'
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(0)'
                ;(e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 4px 15px rgba(109,40,217,0.35)'
              }}
            >
              <span style={{ fontSize: '1.3rem' }}>📲</span>
              Pay Now with UPI
            </a>
          )}

          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginTop: '0.875rem', flexWrap: 'wrap' }}>
            {['Google Pay', 'PhonePe', 'Paytm', 'BHIM'].map(app => (
              <span key={app} className="badge badge-paid">{app}</span>
            ))}
          </div>
        </div>

        {/* Confirm Payment */}
        <div className="card">
          <h3 style={{ fontWeight: 700, marginBottom: '1rem' }}>Confirm Payment</h3>
          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label className="form-label">UPI Transaction ID (optional)</label>
            <input
              className="form-input"
              placeholder="e.g. 123456789012"
              value={txnId}
              onChange={e => setTxnId(e.target.value)}
            />
            <p className="text-xs text-muted mt-1">Find this in your UPI app after payment</p>
          </div>
          <button
            className="btn btn-success btn-lg w-full"
            onClick={confirmPayment}
            disabled={paying}
          >
            {paying ? '⏳ Confirming...' : '✅ Payment Done — Confirm'}
          </button>
          <p className="text-xs text-muted" style={{ textAlign: 'center', marginTop: '0.75rem' }}>
            Click after completing UPI payment to generate your receipt
          </p>
        </div>
      </div>
    </div>
  )
}

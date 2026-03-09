'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function CustomerLoginPage() {
  const router = useRouter()
  const [form, setForm] = useState({ customer_name: '', customer_mobile: '', trolley_id: 'T001' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const trolleys = ['T001', 'T002', 'T003', 'T004', 'T005', 'T006', 'T007', 'T008']

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!form.customer_name.trim()) return setError('Please enter your name')
    if (!/^[0-9]{10}$/.test(form.customer_mobile)) return setError('Enter a valid 10-digit mobile number')

    setLoading(true)
    try {
      const res = await fetch('/api/session/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to start session')
      router.push(`/customer/billing/${json.data.session.id}`)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page-container" style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', background: '#f8fafc' }}>
      <Link href="/" className="navbar-brand" style={{ marginBottom: '2rem', textDecoration: 'none' }}>
        <div className="brand-icon">🛒</div>
        SmartTrolley
      </Link>

      <div className="card" style={{ width: '100%', maxWidth: '420px' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🛒</div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '0.4rem' }}>Start Shopping</h1>
          <p className="text-secondary text-sm">Enter your details to begin your session</p>
        </div>

        {error && (
          <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label">Your Name</label>
            <input
              className="form-input"
              type="text"
              placeholder="e.g. Rahul Sharma"
              value={form.customer_name}
              onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Mobile Number</label>
            <input
              className="form-input"
              type="tel"
              placeholder="10-digit mobile number"
              value={form.customer_mobile}
              onChange={e => setForm(f => ({ ...f, customer_mobile: e.target.value }))}
              maxLength={10}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Trolley ID</label>
            <select
              className="form-select"
              value={form.trolley_id}
              onChange={e => setForm(f => ({ ...f, trolley_id: e.target.value }))}
            >
              {trolleys.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <p className="text-xs text-muted mt-1">Select the ID shown on your trolley</p>
          </div>

          <button type="submit" className="btn btn-primary btn-lg w-full" style={{ marginTop: '0.5rem' }} disabled={loading}>
            {loading ? '⏳ Starting session...' : '🛒 Start Shopping'}
          </button>
        </form>

        <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'var(--surface-3)', borderRadius: '0.5rem' }}>
          <p className="text-xs text-secondary" style={{ lineHeight: 1.6 }}>
            <strong>How it works:</strong> Scan products with the trolley scanner. Products are added to your bill automatically. Pay via UPI QR code when done.
          </p>
        </div>
      </div>

      <p className="text-sm text-muted" style={{ marginTop: '1.5rem' }}>
        <Link href="/admin/login" style={{ color: 'var(--primary)' }}>Admin Login →</Link>
      </p>
    </div>
  )
}

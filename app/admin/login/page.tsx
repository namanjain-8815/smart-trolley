'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function AdminLoginPage() {
  const router = useRouter()
  const [form, setForm] = useState({ username: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Login failed')
      localStorage.setItem('adminToken', json.data.token)
      router.push('/admin/dashboard')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0f172a', padding: '1.5rem' }}>
      <Link href="/" className="navbar-brand" style={{ marginBottom: '2.5rem', color: '#fff' }}>
        <div className="brand-icon">🛒</div>
        <span style={{ color: '#fff' }}>SmartTrolley</span>
      </Link>

      <div className="card" style={{ width: '100%', maxWidth: '380px' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>⚙️</div>
          <h1 style={{ fontSize: '1.35rem', fontWeight: 800 }}>Admin Login</h1>
          <p className="text-secondary text-sm">Manage products, inventory & analytics</p>
        </div>

        {error && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>⚠️ {error}</div>}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label">Username</label>
            <input
              className="form-input"
              type="text"
              placeholder="admin"
              value={form.username}
              onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
              required
              autoComplete="username"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              className="form-input"
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              required
              autoComplete="current-password"
            />
          </div>
          <button type="submit" className="btn btn-primary btn-lg w-full" style={{ marginTop: '0.5rem' }} disabled={loading}>
            {loading ? '⏳ Logging in...' : '🔐 Login to Dashboard'}
          </button>
        </form>

        <div style={{ marginTop: '1.25rem', padding: '0.875rem', background: 'var(--surface-3)', borderRadius: '0.5rem', textAlign: 'center' }}>
          <p className="text-xs text-muted">Default credentials: <strong>admin</strong> / <strong>admin123</strong></p>
        </div>
      </div>

      <p className="text-sm" style={{ marginTop: '1.5rem', color: '#475569' }}>
        <Link href="/customer/login" style={{ color: '#60a5fa' }}>← Back to Customer Login</Link>
      </p>
    </div>
  )
}

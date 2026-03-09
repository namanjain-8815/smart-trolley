'use client'
import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="page-container" style={{ background: '#f8fafc' }}>
      {/* Navbar */}
      <nav className="navbar">
        <div className="navbar-brand">
          <div className="brand-icon">🛒</div>
          SmartTrolley
        </div>
        <div className="navbar-links">
          <Link href="/customer/login" className="btn btn-primary">Start Shopping</Link>
          <Link href="/admin/login" className="btn btn-outline" style={{ marginLeft: '0.5rem' }}>Admin Login</Link>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ background: '#0f172a', color: '#fff', padding: '5rem 2rem', textAlign: 'center' }}>
        <p style={{ color: '#60a5fa', fontWeight: 600, fontSize: '0.875rem', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '1rem' }}>
          Powered by ESP32 · Barcode Scanner · Load Cell
        </p>
        <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 800, lineHeight: 1.1, marginBottom: '1.25rem' }}>
          Shop Smart.<br />
          <span style={{ color: '#60a5fa' }}>Skip the Queue.</span>
        </h1>
        <p style={{ fontSize: '1.125rem', color: '#94a3b8', maxWidth: '600px', margin: '0 auto 2.5rem' }}>
          Scan products directly from your trolley, get a live bill, and pay via UPI — all without standing in a checkout line.
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/customer/login" className="btn btn-primary btn-lg">
            🛒 Start Shopping
          </Link>
          <Link href="/admin/login" className="btn btn-outline btn-lg" style={{ borderColor: '#475569', color: '#94a3b8' }}>
            ⚙️ Admin Panel
          </Link>
        </div>
      </section>

      {/* How it Works */}
      <section style={{ padding: '4rem 2rem', maxWidth: '1100px', margin: '0 auto', width: '100%' }}>
        <h2 style={{ textAlign: 'center', fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.5rem' }}>How It Works</h2>
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '3rem' }}>Four simple steps to a checkout-free shopping experience</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
          {[
            { icon: '📱', step: '01', title: 'Start Session', desc: 'Enter your name and phone number to start a shopping session linked to your trolley.' },
            { icon: '📦', step: '02', title: 'Scan Products', desc: 'Use the trolley\'s barcode scanner to scan items. Weight is auto-verified by the load cell.' },
            { icon: '🧾', step: '03', title: 'Live Bill', desc: 'See your real-time bill with itemized GST, discounts, and running total on screen.' },
            { icon: '💳', step: '04', title: 'Pay via UPI', desc: 'Scan the QR code with Google Pay, PhonePe, Paytm or BHIM and you\'re done!' },
          ].map(item => (
            <div key={item.step} className="card" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>{item.icon}</div>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>Step {item.step}</div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.5rem' }}>{item.title}</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section style={{ background: 'var(--surface)', padding: '4rem 2rem', borderTop: '1px solid var(--border)' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', alignItems: 'center' }}>
            <div>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '1rem' }}>Built for Modern Retail</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                {[
                  { icon: '🔌', text: 'ESP32 REST API integration for real-time hardware communication' },
                  { icon: '⚖️', text: 'Load cell weight verification prevents theft and scanning errors' },
                  { icon: '📊', text: 'Admin dashboard with live analytics, inventory tracking & sales reports' },
                  { icon: '🔒', text: 'Secure session management with unique trolley IDs and customer records' },
                  { icon: '💰', text: 'Automatic GST calculation, discounts, and digital receipts' },
                  { icon: '📡', text: 'Real-time bill updates — products appear instantly after scanning' },
                ].map((f, i) => (
                  <div key={i} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: '1.25rem', marginTop: '0.1rem' }}>{f.icon}</span>
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{f.text}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="card" style={{ background: '#0f172a', color: '#fff', fontFamily: 'monospace', fontSize: '0.85rem', lineHeight: '1.8' }}>
              <p style={{ color: '#60a5fa', marginBottom: '0.5rem' }}># ESP32 → SmartTrolley API</p>
              <p style={{ color: '#94a3b8' }}>POST /api/scan</p>
              <p>{'{'}</p>
              <p style={{ marginLeft: '1rem' }}><span style={{ color: '#86efac' }}>"trolley_id"</span>: <span style={{ color: '#fde68a' }}>"T001"</span>,</p>
              <p style={{ marginLeft: '1rem' }}><span style={{ color: '#86efac' }}>"barcode"</span>: <span style={{ color: '#fde68a' }}>"8901234567890"</span></p>
              <p>{'}'}</p>
              <div style={{ height: '1px', background: '#1e293b', margin: '0.75rem 0' }} />
              <p style={{ color: '#94a3b8' }}>← 200 OK</p>
              <p>{'{'}</p>
              <p style={{ marginLeft: '1rem' }}><span style={{ color: '#86efac' }}>"product"</span>: {'{'}</p>
              <p style={{ marginLeft: '2rem' }}><span style={{ color: '#86efac' }}>"name"</span>: <span style={{ color: '#fde68a' }}>"Amul Butter 500g"</span>,</p>
              <p style={{ marginLeft: '2rem' }}><span style={{ color: '#86efac' }}>"price"</span>: <span style={{ color: '#c4b5fd' }}>265</span>,</p>
              <p style={{ marginLeft: '2rem' }}><span style={{ color: '#86efac' }}>"gst_percent"</span>: <span style={{ color: '#c4b5fd' }}>5</span></p>
              <p style={{ marginLeft: '1rem' }}>{'}'}</p>
              <p>{'}'}</p>
            </div>
          </div>
        </div>
      </section>

      {/* UPI Section */}
      <section style={{ padding: '4rem 2rem', textAlign: 'center' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.75rem' }}>Pay with Any UPI App</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', lineHeight: 1.6 }}>
            A unique QR code is generated for your exact bill amount. Scan it with your preferred UPI app to complete payment instantly.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
            {['Google Pay', 'PhonePe', 'Paytm', 'BHIM', 'Amazon Pay'].map(app => (
              <div key={app} className="card" style={{ padding: '0.75rem 1.25rem', fontWeight: 600, fontSize: '0.875rem', minWidth: '100px', textAlign: 'center' }}>
                💸 {app}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ background: 'var(--primary)', color: '#fff', padding: '3rem 2rem', textAlign: 'center' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '1rem' }}>Ready to Shop Smarter?</h2>
        <p style={{ color: '#bfdbfe', marginBottom: '2rem' }}>Enter your details and start scanning — your trolley is waiting.</p>
        <Link href="/customer/login" className="btn btn-lg" style={{ background: '#fff', color: 'var(--primary)', fontWeight: 700 }}>
          🛒 Start Shopping Now
        </Link>
      </section>

      {/* Footer */}
      <footer style={{ background: 'var(--secondary)', color: '#475569', padding: '1.5rem 2rem', textAlign: 'center', fontSize: '0.85rem' }}>
        <p>© 2024 SmartTrolley System · Built with Next.js + Supabase · ESP32 Hardware Integration</p>
      </footer>
    </div>
  )
}

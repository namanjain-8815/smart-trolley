'use client'
import { useState, useEffect } from 'react'

interface InventoryItem {
  id: string
  name: string
  barcode: string
  stock_qty: number
  price: number
  stockStatus: 'ok' | 'low' | 'out_of_stock'
}

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [restockId, setRestockId] = useState<string | null>(null)
  const [restockQty, setRestockQty] = useState('')
  const [saving, setSaving] = useState(false)
  const [filter, setFilter] = useState<'all' | 'low' | 'out_of_stock'>('all')

  function getToken() { return localStorage.getItem('adminToken') || '' }

  async function fetchInventory() {
    try {
      const res = await fetch('/api/admin/inventory', { headers: { 'x-admin-token': getToken() } })
      const json = await res.json()
      if (res.ok) setItems(json.data)
      else setError(json.error)
    } catch { setError('Failed to load inventory') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchInventory() }, [])

  async function handleRestock(productId: string) {
    const qty = parseInt(restockQty)
    if (!qty || qty < 0) return setError('Enter a valid quantity')
    setSaving(true)
    try {
      const res = await fetch('/api/admin/inventory', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': getToken() },
        body: JSON.stringify({ product_id: productId, new_stock: qty }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setSuccess('Stock updated successfully')
      setRestockId(null)
      setRestockQty('')
      fetchInventory()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Restock failed')
    } finally {
      setSaving(false)
    }
  }

  const filtered = items.filter(i => filter === 'all' || i.stockStatus === filter)
  const outOfStock = items.filter(i => i.stockStatus === 'out_of_stock').length
  const lowStock = items.filter(i => i.stockStatus === 'low').length
  const okStock = items.filter(i => i.stockStatus === 'ok').length

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Inventory</h1>
          <p className="text-secondary text-sm">Stock levels for all products</p>
        </div>
        <button className="btn btn-outline btn-sm" onClick={fetchInventory}>🔄 Refresh</button>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>⚠️ {error}</div>}
      {success && <div className="alert alert-success" style={{ marginBottom: '1rem' }}>✅ {success}</div>}

      {/* Summary Cards */}
      <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card" style={{ borderLeft: '4px solid var(--accent)' }}>
          <p className="stat-label">In Stock</p>
          <p className="stat-value">{okStock}</p>
        </div>
        <div className="stat-card" style={{ borderLeft: '4px solid var(--warning)' }}>
          <p className="stat-label">Low Stock</p>
          <p className="stat-value" style={{ color: 'var(--warning)' }}>{lowStock}</p>
          <p className="stat-sub">Below 10 units</p>
        </div>
        <div className="stat-card" style={{ borderLeft: '4px solid var(--danger)' }}>
          <p className="stat-label">Out of Stock</p>
          <p className="stat-value" style={{ color: 'var(--danger)' }}>{outOfStock}</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        {[
          { key: 'all', label: 'All Products' },
          { key: 'low', label: '⚠️ Low Stock' },
          { key: 'out_of_stock', label: '❌ Out of Stock' },
        ].map(tab => (
          <button
            key={tab.key}
            className={`btn btn-sm ${filter === tab.key ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setFilter(tab.key as typeof filter)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}><div className="spinner" style={{ margin: 'auto' }} /></div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Product Name</th>
                <th>Barcode</th>
                <th>Price</th>
                <th>Stock Qty</th>
                <th>Status</th>
                <th>Restock</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(item => (
                <tr key={item.id}>
                  <td><strong>{item.name}</strong></td>
                  <td><code style={{ fontSize: '0.78rem', background: 'var(--surface-3)', padding: '0.15rem 0.4rem', borderRadius: '0.25rem' }}>{item.barcode}</code></td>
                  <td>₹{item.price.toFixed(2)}</td>
                  <td>
                    <strong style={{ color: item.stockStatus === 'out_of_stock' ? 'var(--danger)' : item.stockStatus === 'low' ? 'var(--warning)' : 'var(--text-primary)' }}>
                      {item.stock_qty}
                    </strong>
                  </td>
                  <td>
                    <span className={`badge badge-${item.stockStatus === 'ok' ? 'ok' : item.stockStatus === 'low' ? 'low' : 'oos'}`}>
                      {item.stockStatus === 'ok' ? '✓ OK' : item.stockStatus === 'low' ? '⚠ Low' : '✕ Out of Stock'}
                    </span>
                  </td>
                  <td>
                    {restockId === item.id ? (
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <input
                          className="form-input"
                          type="number"
                          style={{ width: '80px', padding: '0.3rem 0.5rem', fontSize: '0.85rem' }}
                          placeholder="Qty"
                          value={restockQty}
                          onChange={e => setRestockQty(e.target.value)}
                          min={0}
                        />
                        <button className="btn btn-success btn-sm" onClick={() => handleRestock(item.id)} disabled={saving}>
                          {saving ? '...' : '✓'}
                        </button>
                        <button className="btn btn-ghost btn-sm" onClick={() => { setRestockId(null); setRestockQty('') }}>✕</button>
                      </div>
                    ) : (
                      <button className="btn btn-outline btn-sm" onClick={() => { setRestockId(item.id); setRestockQty(String(item.stock_qty)) }}>
                        📦 Restock
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

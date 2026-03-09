'use client'
import { useState, useEffect } from 'react'

interface Product {
  id: string
  barcode: string
  name: string
  price: number
  gst_percent: number
  discount_percent: number
  weight_grams: number
  stock_qty: number
}

const EMPTY: Omit<Product, 'id'> = { barcode: '', name: '', price: 0, gst_percent: 5, discount_percent: 0, weight_grams: 0, stock_qty: 0 }

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState<Product | null>(null)
  const [form, setForm] = useState<Omit<Product, 'id'>>(EMPTY)
  const [search, setSearch] = useState('')

  function getToken() { return localStorage.getItem('adminToken') || '' }

  async function fetchProducts() {
    try {
      const res = await fetch('/api/admin/products', { headers: { 'x-admin-token': getToken() } })
      const json = await res.json()
      if (res.ok) setProducts(json.data)
    } catch {
      setError('Failed to load products')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchProducts() }, [])

  function openAdd() { setEditItem(null); setForm(EMPTY); setShowForm(true); setError(''); setSuccess('') }
  function openEdit(p: Product) { setEditItem(p); setForm({ barcode: p.barcode, name: p.name, price: p.price, gst_percent: p.gst_percent, discount_percent: p.discount_percent, weight_grams: p.weight_grams, stock_qty: p.stock_qty }); setShowForm(true); setError(''); setSuccess('') }
  function closeForm() { setShowForm(false); setEditItem(null) }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setError(''); setSuccess('')
    try {
      const url = editItem ? `/api/admin/products/${editItem.id}` : '/api/admin/products'
      const method = editItem ? 'PUT' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json', 'x-admin-token': getToken() }, body: JSON.stringify(form) })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setSuccess(editItem ? 'Product updated!' : 'Product added!')
      closeForm()
      fetchProducts()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return
    try {
      const res = await fetch(`/api/admin/products/${id}`, { method: 'DELETE', headers: { 'x-admin-token': getToken() } })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setSuccess('Product deleted')
      fetchProducts()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Delete failed')
    }
  }

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.barcode.includes(search)
  )

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Products</h1>
          <p className="text-secondary text-sm">{products.length} products in database</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>+ Add Product</button>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>⚠️ {error}</div>}
      {success && <div className="alert alert-success" style={{ marginBottom: '1rem' }}>✅ {success}</div>}

      {/* Add/Edit Form */}
      {showForm && (
        <div className="card" style={{ marginBottom: '1.5rem', border: '2px solid var(--primary-light)' }}>
          <div className="card-header">
            <h2 className="card-title">{editItem ? '✏️ Edit Product' : '➕ Add New Product'}</h2>
            <button className="btn btn-ghost btn-sm" onClick={closeForm}>✕ Close</button>
          </div>
          <form onSubmit={handleSave}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
              {[
                { key: 'barcode', label: 'Barcode', type: 'text', placeholder: '8901234567890' },
                { key: 'name', label: 'Product Name', type: 'text', placeholder: 'e.g. Amul Butter 500g' },
                { key: 'price', label: 'Price (₹)', type: 'number', placeholder: '0.00', step: '0.01' },
                { key: 'gst_percent', label: 'GST %', type: 'number', placeholder: '5', step: '0.1' },
                { key: 'discount_percent', label: 'Discount %', type: 'number', placeholder: '0', step: '0.1' },
                { key: 'weight_grams', label: 'Weight (grams)', type: 'number', placeholder: '500' },
                { key: 'stock_qty', label: 'Stock Qty', type: 'number', placeholder: '100' },
              ].map(field => (
                <div className="form-group" key={field.key}>
                  <label className="form-label">{field.label}</label>
                  <input
                    className="form-input"
                    type={field.type}
                    placeholder={field.placeholder}
                    step={field.step}
                    value={form[field.key as keyof typeof form]}
                    onChange={e => setForm(f => ({ ...f, [field.key]: field.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value }))}
                    required
                  />
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? '⏳ Saving...' : editItem ? '💾 Update Product' : '➕ Add Product'}
              </button>
              <button type="button" className="btn btn-ghost" onClick={closeForm}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Search */}
      <div style={{ marginBottom: '1rem' }}>
        <input
          className="form-input"
          style={{ maxWidth: '320px' }}
          placeholder="🔍 Search by name or barcode..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Products Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}><div className="spinner" style={{ margin: 'auto' }} /></div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📦</div>
          <p>{search ? 'No products match your search.' : 'No products yet. Add your first product!'}</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Barcode</th>
                <th>Name</th>
                <th>Price</th>
                <th>GST %</th>
                <th>Discount %</th>
                <th>Weight</th>
                <th>Stock</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id}>
                  <td><code style={{ fontSize: '0.78rem', background: 'var(--surface-3)', padding: '0.15rem 0.4rem', borderRadius: '0.25rem' }}>{p.barcode}</code></td>
                  <td><strong>{p.name}</strong></td>
                  <td>₹{p.price.toFixed(2)}</td>
                  <td>{p.gst_percent}%</td>
                  <td>{p.discount_percent > 0 ? <span className="text-success">{p.discount_percent}%</span> : <span className="text-muted">—</span>}</td>
                  <td>{p.weight_grams}g</td>
                  <td>
                    <span className={`badge badge-${p.stock_qty === 0 ? 'oos' : p.stock_qty < 10 ? 'low' : 'ok'}`}>
                      {p.stock_qty === 0 ? 'Out of Stock' : p.stock_qty < 10 ? `Low: ${p.stock_qty}` : p.stock_qty}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button className="btn btn-outline btn-sm" onClick={() => openEdit(p)}>✏️ Edit</button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(p.id, p.name)}>🗑️</button>
                    </div>
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

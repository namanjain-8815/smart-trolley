'use client'
import { useState, useEffect } from 'react'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, LineElement, PointElement,
  Title, Tooltip, Legend, ArcElement,
} from 'chart.js'
import { Bar, Line } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend, ArcElement)

interface AnalyticsData {
  dailyRevenue: Record<string, number>
  dailyTransactions: Record<string, number>
  totalRevenue: number
  totalTransactions: number
  topProducts: { name: string; totalQty: number }[]
}

const CHART_OPTS = {
  responsive: true,
  plugins: { legend: { display: false } },
  scales: { y: { beginAtZero: true, grid: { color: '#f1f5f9' } }, x: { grid: { display: false } } },
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  function getToken() { return localStorage.getItem('adminToken') || '' }

  useEffect(() => {
    fetch('/api/admin/analytics', { headers: { 'x-admin-token': getToken() } })
      .then(r => r.json())
      .then(json => { if (json.success) setData(json.data); else setError(json.error) })
      .catch(() => setError('Failed to load analytics'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px' }}><div className="spinner" /></div>
  if (error) return <div className="alert alert-error">{error}</div>
  if (!data) return null

  const days = Object.keys(data.dailyRevenue).sort()
  const labels = days.map(d => new Date(d).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }))

  const revenueChart = {
    labels,
    datasets: [{
      label: 'Revenue (₹)',
      data: days.map(d => data.dailyRevenue[d] || 0),
      backgroundColor: 'rgba(37, 99, 235, 0.15)',
      borderColor: '#2563eb',
      borderWidth: 2,
      fill: true,
      tension: 0.3,
    }],
  }

  const txnChart = {
    labels,
    datasets: [{
      label: 'Transactions',
      data: days.map(d => data.dailyTransactions[d] || 0),
      backgroundColor: '#22c55e',
      borderRadius: 6,
    }],
  }

  const topProductsChart = {
    labels: data.topProducts.slice(0, 8).map(p => p.name.length > 15 ? p.name.slice(0, 15) + '…' : p.name),
    datasets: [{
      label: 'Units Sold',
      data: data.topProducts.slice(0, 8).map(p => p.totalQty),
      backgroundColor: '#6366f1',
      borderRadius: 6,
    }],
  }

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Sales Analytics</h1>
        <p className="text-secondary text-sm">Revenue, transactions & top products (last 7 days + all-time)</p>
      </div>

      {/* KPI Cards */}
      <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#dcfce7' }}>💰</div>
          <p className="stat-label">Total Revenue (All Time)</p>
          <p className="stat-value">₹{data.totalRevenue.toLocaleString('en-IN')}</p>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#dbeafe' }}>🧾</div>
          <p className="stat-label">Total Transactions</p>
          <p className="stat-value">{data.totalTransactions}</p>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#ede9fe' }}>📊</div>
          <p className="stat-label">Avg Order Value</p>
          <p className="stat-value">
            ₹{data.totalTransactions ? (data.totalRevenue / data.totalTransactions).toFixed(2) : '0.00'}
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {/* Revenue Chart */}
        <div className="card">
          <h3 className="card-title" style={{ marginBottom: '1rem' }}>📈 Daily Revenue (₹)</h3>
          {days.length === 0 ? (
            <p className="text-muted text-sm" style={{ textAlign: 'center', padding: '2rem' }}>No data yet</p>
          ) : (
            <Line data={revenueChart} options={CHART_OPTS} />
          )}
        </div>

        {/* Transactions Chart */}
        <div className="card">
          <h3 className="card-title" style={{ marginBottom: '1rem' }}>🧾 Daily Transactions</h3>
          {days.length === 0 ? (
            <p className="text-muted text-sm" style={{ textAlign: 'center', padding: '2rem' }}>No data yet</p>
          ) : (
            <Bar data={txnChart} options={CHART_OPTS} />
          )}
        </div>
      </div>

      {/* Top Products */}
      <div className="card">
        <h3 className="card-title" style={{ marginBottom: '1rem' }}>🏆 Top Selling Products</h3>
        {data.topProducts.length === 0 ? (
          <p className="text-muted text-sm" style={{ textAlign: 'center', padding: '2rem' }}>No sales data yet</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <Bar data={topProductsChart} options={{ ...CHART_OPTS, indexAxis: 'y' as const }} />
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>#</th><th>Product</th><th>Units Sold</th></tr>
                </thead>
                <tbody>
                  {data.topProducts.map((p, i) => (
                    <tr key={p.name}>
                      <td><strong>#{i + 1}</strong></td>
                      <td>{p.name}</td>
                      <td><span className="badge badge-paid">{p.totalQty}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

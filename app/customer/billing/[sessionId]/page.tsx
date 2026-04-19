'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'

interface Product {
  name: string
  barcode: string
}

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
  const [totals, setTotals] = useState<Totals>({
    subtotal: 0,
    totalDiscount: 0,
    totalGst: 0,
    grandTotal: 0
  })

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [removing, setRemoving] = useState<string | null>(null)
  const [lastChanged, setLastChanged] = useState<string | null>(null)
  const [mode, setMode] = useState<ScanMode>('ADD')
  const [toasts, setToasts] = useState<Toast[]>([])

  const prevItemsRef = useRef<ScannedItem[]>([])
  const toastCountRef = useRef(0)
  const trolleyIdRef = useRef<string | null>(null)
  const isFirstFetch = useRef(true)

  // =====================================================
  // TOAST
  // =====================================================

  const showToast = useCallback(
    (message: string, type: Toast['type']) => {
      const id = ++toastCountRef.current

      setToasts(prev => [...prev, { id, message, type }])

      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id))
      }, 3000)
    },
    []
  )

  // =====================================================
  // FLASH ROW
  // =====================================================

  const flashRow = useCallback((id: string) => {
    setLastChanged(id)

    setTimeout(() => {
      setLastChanged(prev =>
        prev === id ? null : prev
      )
    }, 2500)
  }, [])

  // =====================================================
  // FETCH MODE
  // =====================================================

  const fetchMode = useCallback(
    async (trolleyId: string) => {
      try {
        const res = await fetch(
          `/api/mode?trolley_id=${encodeURIComponent(
            trolleyId
          )}`
        )

        const json = await res.json()

        if (!res.ok || !json.data?.mode) return

        const newMode: ScanMode =
          json.data.mode

        setMode(prev => {
          if (prev !== newMode) {
            if (newMode === 'REMOVE') {
              showToast(
                '🔴 Switched to REMOVE mode',
                'danger'
              )
            } else {
              showToast(
                '🟢 Switched to ADD mode',
                'success'
              )
            }
          }

          return newMode
        })
      } catch {}
    },
    [showToast]
  )

  // =====================================================
  // FETCH BILL
  // =====================================================

  const fetchBill = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/bill/${sessionId}`
      )

      const json = await res.json()

      if (!res.ok) {
        throw new Error(
          json.error || 'Failed'
        )
      }

      const newSession: Session =
        json.data.session

      const curr: ScannedItem[] =
        json.data.items || []

      setSession(newSession)
      setTotals(json.data.totals)

      if (newSession?.trolley_id) {
        trolleyIdRef.current =
          newSession.trolley_id
      }

      const prev =
        prevItemsRef.current

      // Skip first diff
      if (!isFirstFetch.current) {

        const prevMap = new Map(
          prev.map(i => [i.id, i])
        )

        const currMap = new Map(
          curr.map(i => [i.id, i])
        )

        // Removed
        for (const [id, item] of prevMap) {
          if (!currMap.has(id)) {
            showToast(
              `🗑️ Removed: ${item.products?.name}`,
              'danger'
            )
          }
        }

        // Added / qty changed
        for (const [id, item] of currMap) {

          const oldItem =
            prevMap.get(id)

          if (!oldItem) {
            showToast(
              `✅ Added: ${item.products?.name}`,
              'success'
            )

            flashRow(id)

          } else if (
            item.quantity >
            oldItem.quantity
          ) {

            showToast(
              `✅ Added: ${item.products?.name}`,
              'success'
            )

            flashRow(id)

          } else if (
            item.quantity <
            oldItem.quantity
          ) {

            showToast(
              `🗑️ Removed: ${item.products?.name}`,
              'warning'
            )

            flashRow(id)
          }
        }
      }

      isFirstFetch.current = false
      prevItemsRef.current = curr
      setItems(curr)

      // =====================================
      // IMPORTANT REDIRECTS
      // =====================================

      if (
        newSession.status === 'billing'
      ) {
        router.push(
          `/customer/payment/${sessionId}`
        )
        return
      }

      if (
        newSession.status === 'paid'
      ) {
        router.push(
          `/customer/receipt/${sessionId}`
        )
        return
      }

    } catch (e: any) {
      setError(
        e.message ||
          'Failed to load bill'
      )
    } finally {
      setLoading(false)
    }
  }, [
    sessionId,
    router,
    showToast,
    flashRow
  ])

  // =====================================================
  // POLLING
  // =====================================================

  useEffect(() => {
    fetchBill()

    const id = setInterval(
      fetchBill,
      3000
    )

    return () => clearInterval(id)
  }, [fetchBill])

  useEffect(() => {
    const id = setInterval(() => {
      if (trolleyIdRef.current) {
        fetchMode(
          trolleyIdRef.current
        )
      }
    }, 2000)

    return () => clearInterval(id)
  }, [fetchMode])

  // =====================================================
  // REMOVE ITEM BUTTON
  // =====================================================

  async function removeItem(
    itemId: string
  ) {
    if (
      !confirm(
        'Remove this item?'
      )
    )
      return

    setRemoving(itemId)

    try {
      const res = await fetch(
        `/api/bill/${sessionId}`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type':
              'application/json'
          },
          body: JSON.stringify({
            item_id: itemId
          })
        }
      )

      if (res.ok) fetchBill()

    } finally {
      setRemoving(null)
    }
  }

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems:
            'center',
          justifyContent:
            'center'
        }}
      >
        Loading...
      </div>
    )
  }

  // =====================================================
  // UI
  // =====================================================

  return (
    <div
      style={{
        padding: '30px',
        fontFamily:
          'sans-serif'
      }}
    >
      <h1>
        SmartTrolley Billing
      </h1>

      {error && (
        <p>{error}</p>
      )}

      <h2>
        Cart (
        {items.length} items)
      </h2>

      {items.map(item => (
        <div
          key={item.id}
          style={{
            border:
              '1px solid #ddd',
            padding: '10px',
            marginBottom:
              '10px'
          }}
        >
          <strong>
            {
              item.products
                ?.name
            }
          </strong>

          <br />

          Qty:
          {item.quantity}

          <br />

          ₹
          {item.subtotal.toFixed(
            2
          )}

          <br />

          <button
            onClick={() =>
              removeItem(
                item.id
              )
            }
          >
            Remove
          </button>
        </div>
      ))}

      <hr />

      <h3>
        Total:
        ₹
        {totals.grandTotal.toFixed(
          2
        )}
      </h3>

      <button
        onClick={() =>
          router.push(
            `/customer/payment/${sessionId}`
          )
        }
      >
        Proceed to Pay
      </button>
    </div>
  )
}

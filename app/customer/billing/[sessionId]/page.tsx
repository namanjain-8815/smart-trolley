'use client'

import {
  useState,
  useEffect,
  useCallback,
  useRef
} from 'react'

import {
  useParams
} from 'next/navigation'

// =====================================================
// TYPES
// =====================================================

interface Product {
  name: string
  barcode: string
}

interface ScannedItem {
  id: string
  quantity: number
  subtotal: number
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

// =====================================================

export default function BillingPage() {

  const params = useParams()

  const sessionId =
    params.sessionId as string

  const [session, setSession] =
    useState<Session | null>(null)

  const [items, setItems] =
    useState<ScannedItem[]>([])

  const [totals, setTotals] =
    useState<Totals>({
      subtotal: 0,
      totalDiscount: 0,
      totalGst: 0,
      grandTotal: 0
    })

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState('')

  const trolleyRef =
    useRef('T002')

// =====================================================
// LOAD FIRST SESSION
// =====================================================

  const loadFirst =
    useCallback(async () => {

    try {

      const res =
        await fetch(
          `/api/bill/${sessionId}`,
          { cache: 'no-store' }
        )

      const json =
        await res.json()

      if (
        json?.data?.session
      ) {

        trolleyRef.current =
          json.data.session.trolley_id

        setSession(
          json.data.session
        )
      }

    } catch {}

  }, [sessionId])

// =====================================================
// FETCH BILL
// =====================================================

  const fetchBill =
    useCallback(async () => {

    try {

      const trolleyId =
        trolleyRef.current

      const res =
        await fetch(
          `/api/bill/${trolleyId}`,
          { cache: 'no-store' }
        )

      const json =
        await res.json()

      if (!res.ok) {
        throw new Error(
          json.error ||
          'Failed'
        )
      }

      const newSession =
        json.data.session

      // =====================================
      // REDIRECT FIRST
      // =====================================

      /*/if (
        newSession.status ===
        'billing'
      ) {
        window.location.replace(
          `/customer/payment/${newSession.id}`
        )
        return
      }

      if (
        newSession.status ===
        'paid'
      ) {
        window.location.replace(
          `/customer/receipt/${newSession.id}`
        )
        return
      }*/

      // =====================================
      // UPDATE UI
      // =====================================

      setSession(newSession)

      setItems(
        json.data.items || []
      )

      setTotals(
        json.data.totals
      )

    } catch (e: any) {

      setError(
        e.message ||
        'Load failed'
      )

    } finally {

      setLoading(false)
    }

  }, [])

// =====================================================
// START
// =====================================================

  useEffect(() => {
    loadFirst()
  }, [loadFirst])

  useEffect(() => {

    fetchBill()

    const id =
      setInterval(
        fetchBill,
        1000
      )

    return () =>
      clearInterval(id)

  }, [fetchBill])

// =====================================================
// REMOVE ITEM
// =====================================================

  async function removeItem(
    itemId: string
  ) {

    await fetch(
      `/api/bill/${session?.id}`,
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

    fetchBill()
  }

// =====================================================
// UI
// =====================================================

  if (loading) {
    return <div>Loading...</div>
  }

  return (

    <div
      style={{
        padding: 30,
        fontFamily:
          'sans-serif'
      }}
    >

      <h1>
        SmartTrolley
      </h1>

      <h2>
        Trolley:
        {session?.trolley_id}
      </h2>

      <p>
        Status:
        {session?.status}
      </p>

      {error && (
        <p>{error}</p>
      )}

      <hr />

      <h2>
        Cart (
        {items.length}
        )
      </h2>

      {items.map(item => (

        <div
          key={item.id}
          style={{
            border:
              '1px solid #ddd',
            padding: 10,
            marginBottom: 10
          }}
        >

          <strong>
            {
              item.products?.name
            }
          </strong>

          <br />

          Qty:
          {item.quantity}

          <br />

          ₹
          {item.subtotal}

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

      <h2>
        Total ₹
        {
          totals.grandTotal
        }
      </h2>

      <button
        onClick={() =>
          window.location.href =
          `/customer/payment/${session?.id}`
        }
      >
        Proceed to Pay
      </button>

    </div>
  )
}

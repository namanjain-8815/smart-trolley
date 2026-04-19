import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import {
  ok,
  err,
  calculateBillTotals,
  generateUpiLink
} from '@/lib/apiHelpers'

// =====================================================
// HELPER
// Find session by:
// 1. real session UUID
// 2. trolley id like T001 / T002
// =====================================================
async function findSession(
  value: string
) {
  // Try by session UUID
  const direct =
    await supabaseAdmin
      .from('trolley_sessions')
      .select('*')
      .eq('id', value)
      .single()

  if (direct.data) {
    return direct.data
  }

  // Try by trolley id
  const trolley =
    await supabaseAdmin
      .from('trolley_sessions')
      .select('*')
      .eq(
        'trolley_id',
        value
          .trim()
          .toUpperCase()
      )
      .in('status', [
        'active',
        'billing'
      ])
      .order(
        'created_at',
        {
          ascending: false
        }
      )
      .limit(1)
      .single()

  return trolley.data
}

// =====================================================
// GET
// Works with BOTH:
// /api/bill/T002
// /api/bill/uuid-session-id
// =====================================================
export async function GET(
  _req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {

    const key =
      params.sessionId

    const session =
      await findSession(key)

    if (!session) {
      return err(
        'Session not found',
        404
      )
    }

    const { data: items, error } =
      await supabaseAdmin
        .from(
          'scanned_items'
        )
        .select(`
          id,
          quantity,
          unit_price,
          gst_percent,
          discount_percent,
          gst_amount,
          discount_amount,
          subtotal,
          verified,
          weight_expected,
          created_at,
          products (
            id,
            name,
            barcode,
            weight_grams
          )
        `)
        .eq(
          'session_id',
          session.id
        )
        .order(
          'created_at',
          {
            ascending: true
          }
        )

    if (error) throw error

    const totals =
      calculateBillTotals(
        (items || []).map(
          (i: any) => ({
            quantity:
              i.quantity,
            unit_price:
              i.unit_price,
            gst_percent:
              i.gst_percent,
            discount_percent:
              i.discount_percent
          })
        )
      )

    const upiLink =
      generateUpiLink(
        totals.grandTotal,
        session.id
      )

    return ok({
      success: true,
      data: {
        session,
        items:
          items || [],
        totals,
        upiLink
      }
    })

  } catch (e: any) {

    return err(
      e.message ||
        'Failed to fetch bill',
      500
    )
  }
}

// =====================================================
// POST
// Checkout barcode scan
// /api/bill/T002
// =====================================================
export async function POST(
  _req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {

    const trolleyId =
      params.sessionId
        .trim()
        .toUpperCase()

    const {
      data: sessions,
      error
    } = await supabaseAdmin
      .from(
        'trolley_sessions'
      )
      .select('*')
      .eq(
        'trolley_id',
        trolleyId
      )
      .eq(
        'status',
        'active'
      )
      .order(
        'created_at',
        {
          ascending: false
        }
      )

    if (error) throw error

    if (
      !sessions ||
      sessions.length === 0
    ) {
      return err(
        'No active session',
        404
      )
    }

    // newest active session
    const current =
      sessions[0]

    // cancel duplicate active sessions
    if (
      sessions.length > 1
    ) {

      const oldIds =
        sessions
          .slice(1)
          .map(
            (s: any) =>
              s.id
          )

      await supabaseAdmin
        .from(
          'trolley_sessions'
        )
        .update({
          status:
            'cancelled'
        })
        .in('id', oldIds)
    }

    // KEEP ITEMS
    // only billing mode
    await supabaseAdmin
      .from(
        'trolley_sessions'
      )
      .update({
        status:
          'billing'
      })
      .eq(
        'id',
        current.id
      )

    return ok({
      success: true,
      trolley:
        trolleyId,
      sessionId:
        current.id,
      redirect:
        `/customer/payment/${current.id}`,
      message:
        'Proceed to payment'
    })

  } catch (e: any) {

    return err(
      e.message ||
        'Checkout failed',
      500
    )
  }
}

// =====================================================
// DELETE
// remove item manually
// =====================================================
export async function DELETE(
  req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {

    const key =
      params.sessionId

    const session =
      await findSession(key)

    if (!session) {
      return err(
        'Session not found',
        404
      )
    }

    const {
      item_id
    } = await req.json()

    if (!item_id) {
      return err(
        'item_id required',
        400
      )
    }

    const { error } =
      await supabaseAdmin
        .from(
          'scanned_items'
        )
        .delete()
        .eq(
          'id',
          item_id
        )
        .eq(
          'session_id',
          session.id
        )

    if (error) throw error

    return ok({
      success: true,
      message:
        'Item removed'
    })

  } catch (e: any) {

    return err(
      e.message ||
        'Delete failed',
      500
    )
  }
}

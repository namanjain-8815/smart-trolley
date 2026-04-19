import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import {
  ok,
  err,
  calculateBillTotals,
  generateUpiLink
} from '@/lib/apiHelpers'

// =====================================================
// GET /api/bill/[sessionId]
// View bill details for website
// =====================================================
export async function GET(
  _req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {

    const { sessionId } = params

    const { data: session, error: sessionError } =
      await supabaseAdmin
        .from('trolley_sessions')
        .select('*')
        .eq('id', sessionId)
        .single()

    if (sessionError || !session) {
      return err('Session not found', 404)
    }

    const { data: items, error: itemsError } =
      await supabaseAdmin
        .from('scanned_items')
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
        .eq('session_id', sessionId)
        .order('created_at', {
          ascending: true
        })

    if (itemsError) throw itemsError

    const totals =
      calculateBillTotals(
        (items || []).map((i: any) => ({
          quantity: i.quantity,
          unit_price: i.unit_price,
          gst_percent: i.gst_percent,
          discount_percent:
            i.discount_percent
        }))
      )

    const upiLink =
      generateUpiLink(
        totals.grandTotal,
        sessionId
      )

    return ok({
      success: true,
      data: {
        session,
        items: items || [],
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
// POST /api/bill/T002
// Checkout barcode from ESP32
// Works for multiple trolleys simultaneously
// Only affects that trolley
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

    // Find this trolley active sessions only
    const {
      data: sessions,
      error
    } = await supabaseAdmin
      .from('trolley_sessions')
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

    // newest session
    const current =
      sessions[0]

    // cancel duplicates
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

    // Move current session to billing
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
// DELETE /api/bill/[sessionId]
// Remove item manually from website
// =====================================================
export async function DELETE(
  req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {

    const { sessionId } =
      params

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
          sessionId
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

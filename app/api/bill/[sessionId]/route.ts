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
// Show bill details on website
// =====================================================
export async function GET(
  _req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {

    const sessionId = params.sessionId

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
        .order('created_at', { ascending: true })

    if (itemsError) throw itemsError

    const totals = calculateBillTotals(
      (items || []).map((i: any) => ({
        quantity: i.quantity,
        unit_price: i.unit_price,
        gst_percent: i.gst_percent,
        discount_percent: i.discount_percent
      }))
    )

    const upiLink =
      generateUpiLink(
        totals.grandTotal,
        sessionId
      )

    return ok({
      session,
      items: items || [],
      totals,
      upiLink
    })

  } catch (e: any) {

    return err(
      e.message || 'Failed to get bill',
      500
    )
  }
}

// =====================================================
// POST /api/bill/T002
// Checkout barcode scanned by ESP32
// Move trolley from active -> billing
// DO NOT delete items
// =====================================================
export async function POST(
  _req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {

    const id = params.sessionId

    let session = null

    // Search using trolley_id first
    const trolleySearch =
      await supabaseAdmin
        .from('trolley_sessions')
        .select('*')
        .eq('trolley_id', id)
        .eq('status', 'active')
        .single()

    if (trolleySearch.data) {
      session = trolleySearch.data
    }

    // If not found, search by real session id
    if (!session) {

      const idSearch =
        await supabaseAdmin
          .from('trolley_sessions')
          .select('*')
          .eq('id', id)
          .single()

      session = idSearch.data
    }

    if (!session) {
      return err('Session not found', 404)
    }

    // Change status only
    await supabaseAdmin
      .from('trolley_sessions')
      .update({
        status: 'billing'
      })
      .eq('id', session.id)

    return ok({
      success: true,
      session_id: session.id,
      message: 'Ready for billing'
    })

  } catch (e: any) {

    return err(
      e.message || 'Checkout failed',
      500
    )
  }
}

// =====================================================
// DELETE /api/bill/[sessionId]
// Remove one item from website bill page
// =====================================================
export async function DELETE(
  req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {

    const sessionId = params.sessionId
    const { item_id } = await req.json()

    if (!item_id) {
      return err('item_id required', 400)
    }

    const { error } =
      await supabaseAdmin
        .from('scanned_items')
        .delete()
        .eq('id', item_id)
        .eq('session_id', sessionId)

    if (error) throw error

    return ok({
      success: true,
      message: 'Item removed'
    })

  } catch (e: any) {

    return err(
      e.message || 'Delete failed',
      500
    )
  }
}

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
// View bill details (used by website)
// =====================================================
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params

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
        discount_percent: i.discount_percent,
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

  } catch (e: unknown) {

    const message =
      e instanceof Error
        ? e.message
        : 'Failed to get bill'

    return err(message, 500)
  }
}

// =====================================================
// POST /api/bill/T002
// Checkout by trolley id OR session id
// Used by ESP32 checkout barcode
// =====================================================
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {

    const { sessionId } = await params

    let session = null

    // First try trolley_id
    const trolleySearch =
      await supabaseAdmin
        .from('trolley_sessions')
        .select('*')
        .eq('trolley_id', sessionId)
        .eq('status', 'active')
        .single()

    if (trolleySearch.data) {
      session = trolleySearch.data
    }

    // If not found, try real session id
    if (!session) {

      const idSearch =
        await supabaseAdmin
          .from('trolley_sessions')
          .select('*')
          .eq('id', sessionId)
          .single()

      session = idSearch.data
    }

    if (!session) {
      return err('Session not found', 404)
    }

    // Delete scanned items
    await supabaseAdmin
      .from('scanned_items')
      .delete()
      .eq('session_id', session.id)

    // Complete session
    await supabaseAdmin
      .from('trolley_sessions')
      .update({
        status: 'completed'
      })
      .eq('id', session.id)

    return ok({
      success: true,
      message: 'Checkout complete'
    })

  } catch (e: unknown) {

    const message =
      e instanceof Error
        ? e.message
        : 'Checkout failed'

    return err(message, 500)
  }
}

// =====================================================
// DELETE /api/bill/[sessionId]
// Remove one scanned item from website
// =====================================================
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {

    const { sessionId } = await params
    const { item_id } = await req.json()

    if (!item_id) {
      return err('item_id is required', 400)
    }

    const { error } =
      await supabaseAdmin
        .from('scanned_items')
        .delete()
        .eq('id', item_id)
        .eq('session_id', sessionId)

    if (error) throw error

    return ok({
      message: 'Item removed from bill'
    })

  } catch (e: unknown) {

    const message =
      e instanceof Error
        ? e.message
        : 'Failed to remove item'

    return err(message, 500)
  }
}

import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import {
  ok,
  err,
  calculateBillTotals,
  generateUpiLink
} from '@/lib/apiHelpers'

// =====================================
// GET BILL
// =====================================
export async function GET(
  req: NextRequest,
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

    if (sessionError || !session)
      return err('Session not found', 404)

    const { data: items, error: itemsError } =
      await supabaseAdmin
        .from('scanned_items')
        .select(`
          *,
          products(*)
        `)
        .eq('session_id', sessionId)

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
    return err(e.message, 500)
  }
}

// =====================================
// POST CHECKOUT
// =====================================
export async function POST(
  req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {

    const id = params.sessionId

    let { data: session } =
      await supabaseAdmin
        .from('trolley_sessions')
        .select('*')
        .eq('trolley_id', id)
        .eq('status', 'active')
        .single()

    if (!session) {
      session = (
        await supabaseAdmin
          .from('trolley_sessions')
          .select('*')
          .eq('id', id)
          .single()
      ).data
    }

    if (!session)
      return err("Session not found", 404)

    await supabaseAdmin
      .from('scanned_items')
      .delete()
      .eq('session_id', session.id)

    await supabaseAdmin
      .from('trolley_sessions')
      .update({
        status: 'completed'
      })
      .eq('id', session.id)

    return ok({
      success: true
    })

  } catch (e: any) {
    return err(e.message, 500)
  }
}

// =====================================
// DELETE ITEM
// =====================================
export async function DELETE(
  req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {

    const sessionId = params.sessionId
    const { item_id } = await req.json()

    await supabaseAdmin
      .from('scanned_items')
      .delete()
      .eq('id', item_id)
      .eq('session_id', sessionId)

    return ok({
      success: true
    })

  } catch (e: any) {
    return err(e.message, 500)
  }
}

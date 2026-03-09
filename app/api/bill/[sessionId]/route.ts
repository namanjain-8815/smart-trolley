import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { ok, err, calculateBillTotals, generateUpiLink } from '@/lib/apiHelpers'

// GET /api/bill/[sessionId] - returns full bill for a session
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params

    const { data: session, error: sessionError } = await supabaseAdmin
      .from('trolley_sessions')
      .select('*')
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) return err('Session not found', 404)

    const { data: items, error: itemsError } = await supabaseAdmin
      .from('scanned_items')
      .select(`
        id, quantity, unit_price, gst_percent, discount_percent,
        gst_amount, discount_amount, subtotal, verified, weight_expected, created_at,
        products ( id, name, barcode, weight_grams )
      `)
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })

    if (itemsError) throw itemsError

    const totals = calculateBillTotals(
      (items || []).map(i => ({
        quantity: i.quantity,
        unit_price: i.unit_price,
        gst_percent: i.gst_percent,
        discount_percent: i.discount_percent,
      }))
    )

    const upiLink = generateUpiLink(totals.grandTotal, sessionId)

    return ok({
      session,
      items: items || [],
      totals,
      upiLink,
    })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Failed to get bill'
    return err(message, 500)
  }
}

// DELETE /api/bill/[sessionId] - remove a scanned item
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params
    const { item_id } = await req.json()
    if (!item_id) return err('item_id is required')

    const { error } = await supabaseAdmin
      .from('scanned_items')
      .delete()
      .eq('id', item_id)
      .eq('session_id', sessionId)

    if (error) throw error
    return ok({ message: 'Item removed from bill' })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Failed to remove item'
    return err(message, 500)
  }
}

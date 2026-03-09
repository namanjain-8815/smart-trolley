import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { ok, err, calculateBillTotals, generateUpiLink } from '@/lib/apiHelpers'

// POST /api/payment/generate - Generate UPI link for session
export async function POST(req: NextRequest) {
  try {
    const { session_id } = await req.json()
    if (!session_id) return err('session_id is required')

    const { data: session } = await supabaseAdmin
      .from('trolley_sessions')
      .select('id, status')
      .eq('id', session_id)
      .single()

    if (!session) return err('Session not found', 404)
    if (session.status === 'paid') return err('This session is already paid', 400)

    // Get items
    const { data: items } = await supabaseAdmin
      .from('scanned_items')
      .select('quantity, unit_price, gst_percent, discount_percent')
      .eq('session_id', session_id)

    if (!items || items.length === 0) return err('No items in cart', 400)

    const totals = calculateBillTotals(items)
    const upiLink = generateUpiLink(totals.grandTotal, session_id)

    // Mark session as checkout (awaiting payment)
    await supabaseAdmin
      .from('trolley_sessions')
      .update({ status: 'checkout' })
      .eq('id', session_id)

    // Create pending payment record
    const { data: payment } = await supabaseAdmin
      .from('payments')
      .upsert({
        session_id,
        amount: totals.grandTotal,
        status: 'pending',
      }, { onConflict: 'session_id' })
      .select()
      .single()

    return ok({ upiLink, totals, payment })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Failed to generate payment'
    return err(message, 500)
  }
}

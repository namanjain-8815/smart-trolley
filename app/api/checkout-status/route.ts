import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { ok, err, generateUpiLink, calculateBillTotals } from '@/lib/apiHelpers'

// GET /api/checkout-status?trolley_id=T001
// Polled by the Arduino LCD sketch every 3 s.
// Returns current session status + UPI link + grand total for that trolley.
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const trolley_id = searchParams.get('trolley_id')
    if (!trolley_id) return err('trolley_id is required')

    // Find the most recent non-active session OR the active one
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('trolley_sessions')
      .select('id, status')
      .eq('trolley_id', trolley_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (sessionError || !session) {
      // No session at all — return idle
      return ok({ status: 'active', session_id: null, grandTotal: 0, upiLink: '' })
    }

    // For idle / active sessions just return the status
    if (session.status === 'active') {
      return ok({ status: 'active', session_id: session.id, grandTotal: 0, upiLink: '' })
    }

    // For checkout / paid — return totals + UPI link so LCD can build QR
    const { data: items } = await supabaseAdmin
      .from('scanned_items')
      .select('quantity, unit_price, gst_percent, discount_percent')
      .eq('session_id', session.id)

    const totals  = calculateBillTotals(items || [])
    const upiLink = generateUpiLink(totals.grandTotal, session.id)

    return ok({
      status:      session.status,   // 'checkout' | 'paid'
      session_id:  session.id,
      grandTotal:  totals.grandTotal,
      upiLink,
    })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Failed to get checkout status'
    return err(message, 500)
  }
}

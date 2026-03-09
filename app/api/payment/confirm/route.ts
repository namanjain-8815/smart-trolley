import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { ok, err } from '@/lib/apiHelpers'

// POST /api/payment/confirm
// Body: { session_id, upi_txn_id }
export async function POST(req: NextRequest) {
  try {
    const { session_id, upi_txn_id } = await req.json()
    if (!session_id) return err('session_id is required')

    // Update payment record
    const { data: payment, error: payErr } = await supabaseAdmin
      .from('payments')
      .update({
        upi_txn_id: upi_txn_id || null,
        status: 'paid',
        paid_at: new Date().toISOString(),
      })
      .eq('session_id', session_id)
      .select()
      .single()

    if (payErr) throw payErr

    // Update session status
    await supabaseAdmin
      .from('trolley_sessions')
      .update({ status: 'paid', completed_at: new Date().toISOString() })
      .eq('id', session_id)

    // Reduce stock for each scanned item
    const { data: items } = await supabaseAdmin
      .from('scanned_items')
      .select('product_id, quantity')
      .eq('session_id', session_id)

    if (items) {
      for (const item of items) {
        await supabaseAdmin.rpc('decrement_stock', {
          p_product_id: item.product_id,
          p_qty: item.quantity,
        })
      }
    }

    return ok({ payment, message: 'Payment confirmed successfully!' })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Failed to confirm payment'
    return err(message, 500)
  }
}

import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { ok, err } from '@/lib/apiHelpers'

// GET /api/receipt/[sessionId]
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params

    const { data: session } = await supabaseAdmin
      .from('trolley_sessions')
      .select('*')
      .eq('id', sessionId)
      .single()

    if (!session) return err('Session not found', 404)

    const { data: items } = await supabaseAdmin
      .from('scanned_items')
      .select(`
        id, quantity, unit_price, gst_percent, discount_percent,
        gst_amount, discount_amount, subtotal,
        products ( name, barcode )
      `)
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })

    const { data: payment } = await supabaseAdmin
      .from('payments')
      .select('*')
      .eq('session_id', sessionId)
      .single()

    return ok({ session, items: items || [], payment })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Failed to get receipt'
    return err(message, 500)
  }
}

import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { ok, err } from '@/lib/apiHelpers'

// =====================================================
// POST /api/bill/T002
// Checkout barcode scan
// =====================================================
export async function POST(
  _req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {

    const trolleyId = params.sessionId

    const { data: session } =
      await supabaseAdmin
        .from('trolley_sessions')
        .select('*')
        .eq('trolley_id', trolleyId)
        .eq('status', 'active')
        .single()

    if (!session) {
      return err("No active session", 404)
    }

    // IMPORTANT:
    // DO NOT DELETE ITEMS

    await supabaseAdmin
      .from('trolley_sessions')
      .update({
        status: 'billing'
      })
      .eq('id', session.id)

    return ok({
      success: true,
      sessionId: session.id,
      redirect:
        `/customer/payment/${session.id}`
    })

  } catch (e: any) {
    return err(e.message, 500)
  }
}

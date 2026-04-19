import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { ok, err } from '@/lib/apiHelpers'

// GET /api/bill/T002
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params

    // First try direct session id
    let { data: session } = await supabaseAdmin
      .from('trolley_sessions')
      .select('*')
      .eq('id', sessionId)
      .single()

    // If not found, treat as trolley_id
    if (!session) {
      const res = await supabaseAdmin
        .from('trolley_sessions')
        .select('*')
        .eq('trolley_id', sessionId)
        .eq('status', 'active')
        .single()

      session = res.data
    }

    if (!session)
      return err('Session not found', 404)

    // clear items
    await supabaseAdmin
      .from('scanned_items')
      .delete()
      .eq('session_id', session.id)

    // complete session
    await supabaseAdmin
      .from('trolley_sessions')
      .update({ status: 'completed' })
      .eq('id', session.id)

    return ok({
      success: true,
      message: 'Checkout complete'
    })

  } catch (e: unknown) {

    const message =
      e instanceof Error ? e.message : 'Checkout failed'

    return err(message, 500)
  }
}

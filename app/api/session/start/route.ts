import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { ok, err } from '@/lib/apiHelpers'

// POST /api/session/start
// Body: { trolley_id, customer_name, customer_mobile }
export async function POST(req: NextRequest) {
  try {
    const { trolley_id, customer_name, customer_mobile } = await req.json()

    if (!trolley_id || !customer_name || !customer_mobile) {
      return err('trolley_id, customer_name, and customer_mobile are required')
    }

    // Check if trolley already has an active session
    const { data: existing } = await supabaseAdmin
      .from('trolley_sessions')
      .select('id')
      .eq('trolley_id', trolley_id)
      .eq('status', 'active')
      .single()

    if (existing) {
      return err(`Trolley ${trolley_id} already has an active session. Please end the current session first.`, 409)
    }

    const { data, error } = await supabaseAdmin
      .from('trolley_sessions')
      .insert({
        trolley_id,
        customer_name,
        customer_mobile,
        status: 'active',
      })
      .select()
      .single()

    if (error) throw error

    return ok({ session: data }, 201)
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Failed to start session'
    return err(message, 500)
  }
}

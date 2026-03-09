import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { ok, err } from '@/lib/apiHelpers'

// POST /api/weight
// Body: { trolley_id, weight_grams }
// Called by ESP32 load cell to verify item was placed in trolley
export async function POST(req: NextRequest) {
  try {
    const { trolley_id, weight_grams } = await req.json()

    if (!trolley_id || weight_grams === undefined) {
      return err('trolley_id and weight_grams are required')
    }

    // Find active session
    const { data: session } = await supabaseAdmin
      .from('trolley_sessions')
      .select('id')
      .eq('trolley_id', trolley_id)
      .eq('status', 'active')
      .single()

    if (!session) {
      return err(`No active session for trolley ${trolley_id}`, 404)
    }

    // Update trolley weight reading
    await supabaseAdmin
      .from('trolley_sessions')
      .update({ current_weight: weight_grams })
      .eq('id', session.id)

    // Get the most recently unverified scanned item
    const { data: unverified } = await supabaseAdmin
      .from('scanned_items')
      .select('id, weight_expected, quantity')
      .eq('session_id', session.id)
      .eq('verified', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (!unverified) {
      return ok({ message: 'Weight recorded, no pending verification', weight: weight_grams })
    }

    // Verify weight: allow ±15% tolerance
    const expected = unverified.weight_expected * unverified.quantity
    const lowerBound = expected * 0.85
    const upperBound = expected * 1.15
    const verified = weight_grams >= lowerBound && weight_grams <= upperBound

    if (verified) {
      await supabaseAdmin
        .from('scanned_items')
        .update({ verified: true })
        .eq('id', unverified.id)
    }

    return ok({
      verified,
      weight_received: weight_grams,
      weight_expected: expected,
      message: verified
        ? 'Item weight verified successfully'
        : `Weight mismatch! Expected ~${expected}g, received ${weight_grams}g`,
    })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Weight update failed'
    return err(message, 500)
  }
}

import { NextRequest } from 'next/server'
import { ok, err } from '@/lib/apiHelpers'
import { getMode } from '@/lib/trolleyMode'

// GET /api/mode?trolley_id=T001
// Returns the current scan mode for a trolley.
// Polled by the billing page UI every 2 seconds.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const trolley_id = searchParams.get('trolley_id')

  if (!trolley_id) {
    return err('trolley_id is required')
  }

  const mode = getMode(trolley_id)
  return ok({ mode, trolley_id })
}

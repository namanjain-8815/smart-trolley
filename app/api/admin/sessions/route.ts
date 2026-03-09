import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { ok, err } from '@/lib/apiHelpers'
import { verifyAdminToken } from '@/lib/adminAuth'

function checkAuth(req: NextRequest) {
  return verifyAdminToken(req.headers.get('x-admin-token'))
}

// GET /api/admin/sessions
export async function GET(req: NextRequest) {
  if (!checkAuth(req)) return err('Unauthorized', 401)
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') // active | checkout | paid | all

  let query = supabaseAdmin
    .from('trolley_sessions')
    .select(`
      id, trolley_id, customer_name, customer_mobile, status,
      current_weight, created_at, completed_at,
      payments ( amount, status, upi_txn_id, paid_at )
    `)
    .order('created_at', { ascending: false })
    .limit(100)

  if (status && status !== 'all') {
    query = query.eq('status', status)
  }

  const { data, error } = await query
  if (error) return err(error.message, 500)
  return ok(data)
}

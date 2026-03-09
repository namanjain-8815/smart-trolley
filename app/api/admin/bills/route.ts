import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { ok, err } from '@/lib/apiHelpers'
import { verifyAdminToken } from '@/lib/adminAuth'

function checkAuth(req: NextRequest) {
  return verifyAdminToken(req.headers.get('x-admin-token'))
}

// GET /api/admin/bills
export async function GET(req: NextRequest) {
  if (!checkAuth(req)) return err('Unauthorized', 401)

  const { data, error } = await supabaseAdmin
    .from('trolley_sessions')
    .select(`
      id, trolley_id, customer_name, customer_mobile, status, created_at, completed_at,
      payments ( amount, status, upi_txn_id, paid_at ),
      scanned_items ( id )
    `)
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) return err(error.message, 500)

  return ok(data)
}

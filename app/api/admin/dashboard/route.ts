import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { ok, err } from '@/lib/apiHelpers'
import { verifyAdminToken } from '@/lib/adminAuth'

function checkAuth(req: NextRequest) {
  const token = req.headers.get('x-admin-token')
  return verifyAdminToken(token)
}

// GET /api/admin/dashboard
export async function GET(req: NextRequest) {
  if (!checkAuth(req)) return err('Unauthorized', 401)

  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayISO = today.toISOString()

    // Active sessions
    const { count: activeSessions } = await supabaseAdmin
      .from('trolley_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')

    // Checkout sessions (awaiting payment)
    const { count: checkoutSessions } = await supabaseAdmin
      .from('trolley_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'checkout')

    // Today's paid sessions
    const { data: todayPayments } = await supabaseAdmin
      .from('payments')
      .select('amount')
      .eq('status', 'paid')
      .gte('paid_at', todayISO)

    const todayRevenue = (todayPayments || []).reduce((sum, p) => sum + p.amount, 0)
    const todayTransactions = (todayPayments || []).length

    // Total products
    const { count: totalProducts } = await supabaseAdmin
      .from('products')
      .select('*', { count: 'exact', head: true })

    // Low stock products
    const { count: lowStock } = await supabaseAdmin
      .from('products')
      .select('*', { count: 'exact', head: true })
      .lt('stock_qty', 10)

    // Recent sessions
    const { data: recentSessions } = await supabaseAdmin
      .from('trolley_sessions')
      .select('id, trolley_id, customer_name, customer_mobile, status, created_at')
      .order('created_at', { ascending: false })
      .limit(10)

    return ok({
      activeSessions: activeSessions || 0,
      checkoutSessions: checkoutSessions || 0,
      todayRevenue: +todayRevenue.toFixed(2),
      todayTransactions,
      totalProducts: totalProducts || 0,
      lowStock: lowStock || 0,
      recentSessions: recentSessions || [],
    })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Dashboard error'
    return err(message, 500)
  }
}

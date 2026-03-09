import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { ok, err } from '@/lib/apiHelpers'
import { verifyAdminToken } from '@/lib/adminAuth'

function checkAuth(req: NextRequest) {
  return verifyAdminToken(req.headers.get('x-admin-token'))
}

// GET /api/admin/analytics
export async function GET(req: NextRequest) {
  if (!checkAuth(req)) return err('Unauthorized', 401)

  try {
    // Last 7 days revenue
    const days7 = new Date()
    days7.setDate(days7.getDate() - 7)

    const { data: payments } = await supabaseAdmin
      .from('payments')
      .select('amount, paid_at')
      .eq('status', 'paid')
      .gte('paid_at', days7.toISOString())
      .order('paid_at', { ascending: true })

    // Group by day
    const dailyRevenue: Record<string, number> = {}
    const dailyTransactions: Record<string, number> = {}
    for (const p of payments || []) {
      const day = p.paid_at?.slice(0, 10) || 'unknown'
      dailyRevenue[day] = (dailyRevenue[day] || 0) + p.amount
      dailyTransactions[day] = (dailyTransactions[day] || 0) + 1
    }

    // Total all time
    const { data: allPayments } = await supabaseAdmin
      .from('payments')
      .select('amount')
      .eq('status', 'paid')

    const totalRevenue = (allPayments || []).reduce((s, p) => s + p.amount, 0)
    const totalTransactions = (allPayments || []).length

    // Top products by quantity sold
    const { data: topItems } = await supabaseAdmin
      .from('scanned_items')
      .select(`
        product_id, quantity,
        products ( name )
      `)
      .order('quantity', { ascending: false })

    // Aggregate top products
    const productMap: Record<string, { name: string; totalQty: number }> = {}
    for (const item of topItems || []) {
      const pid = item.product_id
      if (!productMap[pid]) productMap[pid] = { name: (item.products as unknown as { name: string })?.name || pid, totalQty: 0 }
      productMap[pid].totalQty += item.quantity
    }
    const topProducts = Object.values(productMap)
      .sort((a, b) => b.totalQty - a.totalQty)
      .slice(0, 10)

    return ok({
      dailyRevenue,
      dailyTransactions,
      totalRevenue: +totalRevenue.toFixed(2),
      totalTransactions,
      topProducts,
    })
  } catch (e: unknown) {
    return err(e instanceof Error ? e.message : 'Analytics error', 500)
  }
}

import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { ok, err } from '@/lib/apiHelpers'
import { verifyAdminToken } from '@/lib/adminAuth'

function checkAuth(req: NextRequest) {
  return verifyAdminToken(req.headers.get('x-admin-token'))
}

// GET /api/admin/inventory
export async function GET(req: NextRequest) {
  if (!checkAuth(req)) return err('Unauthorized', 401)

  const { data, error } = await supabaseAdmin
    .from('products')
    .select('id, name, barcode, stock_qty, price')
    .order('stock_qty', { ascending: true })

  if (error) return err(error.message, 500)

  const withStatus = (data || []).map(p => ({
    ...p,
    stockStatus: p.stock_qty === 0 ? 'out_of_stock' : p.stock_qty < 10 ? 'low' : 'ok',
  }))

  return ok(withStatus)
}

// PATCH /api/admin/inventory - restock a product
export async function PATCH(req: NextRequest) {
  if (!checkAuth(req)) return err('Unauthorized', 401)
  try {
    const { product_id, new_stock } = await req.json()
    if (!product_id || new_stock === undefined) return err('product_id and new_stock are required')

    const { data, error } = await supabaseAdmin
      .from('products')
      .update({ stock_qty: new_stock })
      .eq('id', product_id)
      .select()
      .single()

    if (error) return err(error.message, 500)
    return ok(data)
  } catch (e) {
    return err(e instanceof Error ? e.message : 'Restock failed', 500)
  }
}

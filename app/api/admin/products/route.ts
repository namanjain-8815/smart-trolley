import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { ok, err } from '@/lib/apiHelpers'
import { verifyAdminToken } from '@/lib/adminAuth'

function checkAuth(req: NextRequest) {
  return verifyAdminToken(req.headers.get('x-admin-token'))
}

// GET /api/admin/products
export async function GET(req: NextRequest) {
  if (!checkAuth(req)) return err('Unauthorized', 401)
  const { data, error } = await supabaseAdmin
    .from('products')
    .select('*')
    .order('name', { ascending: true })
  if (error) return err(error.message, 500)
  return ok(data)
}

// POST /api/admin/products
export async function POST(req: NextRequest) {
  if (!checkAuth(req)) return err('Unauthorized', 401)
  try {
    const body = await req.json()
    const required = ['barcode', 'name', 'price', 'gst_percent', 'discount_percent', 'weight_grams', 'stock_qty']
    for (const field of required) {
      if (body[field] === undefined || body[field] === '') return err(`Field '${field}' is required`)
    }
    const { data, error } = await supabaseAdmin
      .from('products')
      .insert(body)
      .select()
      .single()
    if (error) return err(error.message, 500)
    return ok(data, 201)
  } catch (e: unknown) {
    return err(e instanceof Error ? e.message : 'Failed to create product', 500)
  }
}

import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { ok, err } from '@/lib/apiHelpers'
import { verifyAdminToken } from '@/lib/adminAuth'

function checkAuth(req: NextRequest) {
  return verifyAdminToken(req.headers.get('x-admin-token'))
}

// GET — list all products (admin) OR look up a single product by ?barcode=
export async function GET(req: NextRequest) {
  try {
    const barcode = req.nextUrl.searchParams.get('barcode')

    if (barcode) {
      // Single-product lookup (used by scanner / public)
      const { data, error } = await supabaseAdmin
        .from('products')
        .select('*')
        .eq('barcode', barcode)
        .single()

      if (error || !data) return err('Not Found', 404)

      return ok({ name: data.name, price: data.price })
    }

    // No barcode param → return full product list (admin products page)
    const { data, error } = await supabaseAdmin
      .from('products')
      .select('*')
      .order('name', { ascending: true })

    if (error) return err(error.message, 500)

    return ok(data)

  } catch (e: unknown) {
    return err(
      e instanceof Error ? e.message : 'Failed to fetch products',
      500
    )
  }
}

// POST — add a new product (admin only)
export async function POST(req: NextRequest) {
  if (!checkAuth(req)) return err('Unauthorized', 401)

  try {
    const body = await req.json()
    const { barcode, name, price, gst_percent, discount_percent, weight_grams, stock_qty } = body

    if (!barcode || !name || price == null) {
      return err('barcode, name and price are required', 400)
    }

    const { data, error } = await supabaseAdmin
      .from('products')
      .insert([{ barcode, name, price, gst_percent, discount_percent, weight_grams, stock_qty }])
      .select()
      .single()

    if (error) return err(error.message, 500)

    return ok(data, 201)

  } catch (e: unknown) {
    return err(
      e instanceof Error ? e.message : 'Failed to add product',
      500
    )
  }
}

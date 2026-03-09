import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { ok, err } from '@/lib/apiHelpers'
import { verifyAdminToken } from '@/lib/adminAuth'

function checkAuth(req: NextRequest) {
  return verifyAdminToken(req.headers.get('x-admin-token'))
}

// PUT /api/admin/products/[id]
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!checkAuth(req)) return err('Unauthorized', 401)
  try {
    const { id } = await params
    const body = await req.json()
    const { data, error } = await supabaseAdmin
      .from('products')
      .update(body)
      .eq('id', id)
      .select()
      .single()
    if (error) return err(error.message, 500)
    return ok(data)
  } catch (e: unknown) {
    return err(e instanceof Error ? e.message : 'Failed to update product', 500)
  }
}

// DELETE /api/admin/products/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!checkAuth(req)) return err('Unauthorized', 401)
  const { id } = await params
  const { error } = await supabaseAdmin.from('products').delete().eq('id', id)
  if (error) return err(error.message, 500)
  return ok({ message: 'Product deleted' })
}

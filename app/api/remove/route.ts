import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { ok, err } from '@/lib/apiHelpers'

// POST /api/remove
// Body: { trolley_id, barcode }
// Removes one quantity of a product from the cart.
// If qty > 1  → decrements by 1 and recalculates subtotal.
// If qty == 1 → deletes the row entirely.
export async function POST(req: NextRequest) {
  try {
    const { trolley_id, barcode } = await req.json()

    if (!trolley_id || !barcode) {
      return err('trolley_id and barcode are required')
    }

    // 1. Find active session
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('trolley_sessions')
      .select('id')
      .eq('trolley_id', trolley_id)
      .eq('status', 'active')
      .single()

    if (sessionError || !session) {
      return err(`No active session found for trolley ${trolley_id}.`, 404)
    }

    // 2. Find product by barcode
    const { data: product, error: productError } = await supabaseAdmin
      .from('products')
      .select('*')
      .eq('barcode', barcode)
      .single()

    if (productError || !product) {
      return err(`Product with barcode ${barcode} not found in database.`, 404)
    }

    // 3. Find existing scanned item in this session
    const { data: existingItem } = await supabaseAdmin
      .from('scanned_items')
      .select('id, quantity')
      .eq('session_id', session.id)
      .eq('product_id', product.id)
      .single()

    if (!existingItem) {
      return err(`"${product.name}" is not in your cart.`, 404)
    }

    let scannedItem = null
    let action: 'decremented' | 'removed'

    if (existingItem.quantity > 1) {
      // Decrement quantity and recalculate financials
      const newQty = existingItem.quantity - 1
      const base = product.price * newQty
      const discount_amount = (base * product.discount_percent) / 100
      const gst_amount = ((base - discount_amount) * product.gst_percent) / 100
      const subtotal = base - discount_amount + gst_amount

      const { data, error } = await supabaseAdmin
        .from('scanned_items')
        .update({
          quantity: newQty,
          gst_amount: +gst_amount.toFixed(2),
          discount_amount: +discount_amount.toFixed(2),
          subtotal: +subtotal.toFixed(2),
        })
        .eq('id', existingItem.id)
        .select()
        .single()

      if (error) throw error
      scannedItem = data
      action = 'decremented'
    } else {
      // qty === 1 — remove the row entirely
      const { error } = await supabaseAdmin
        .from('scanned_items')
        .delete()
        .eq('id', existingItem.id)

      if (error) throw error
      action = 'removed'
    }

    return ok({
      product: { id: product.id, name: product.name, price: product.price },
      scanned_item: scannedItem,
      action,
      mode: 'REMOVE',
    })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Remove failed'
    return err(message, 500)
  }
}

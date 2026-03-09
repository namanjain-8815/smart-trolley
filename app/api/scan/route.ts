import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { ok, err } from '@/lib/apiHelpers'

// POST /api/scan
// Body: { trolley_id, barcode }
// Called by ESP32 when a product barcode is scanned
export async function POST(req: NextRequest) {
  try {
    const { trolley_id, barcode } = await req.json()

    if (!trolley_id || !barcode) {
      return err('trolley_id and barcode are required')
    }

    // 1. Find active session for this trolley
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('trolley_sessions')
      .select('id')
      .eq('trolley_id', trolley_id)
      .eq('status', 'active')
      .single()

    if (sessionError || !session) {
      return err(`No active session found for trolley ${trolley_id}. Please start a session first.`, 404)
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

    // 3. Check stock
    if (product.stock_qty <= 0) {
      return err(`Product "${product.name}" is out of stock.`, 400)
    }

    // 4. Check if item already scanned in this session (increment qty)
    const { data: existingItem } = await supabaseAdmin
      .from('scanned_items')
      .select('id, quantity')
      .eq('session_id', session.id)
      .eq('product_id', product.id)
      .single()

    let scannedItem
    if (existingItem) {
      const newQty = existingItem.quantity + 1
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
    } else {
      const base = product.price * 1
      const discount_amount = (base * product.discount_percent) / 100
      const gst_amount = ((base - discount_amount) * product.gst_percent) / 100
      const subtotal = base - discount_amount + gst_amount

      const { data, error } = await supabaseAdmin
        .from('scanned_items')
        .insert({
          session_id: session.id,
          product_id: product.id,
          quantity: 1,
          unit_price: product.price,
          gst_percent: product.gst_percent,
          discount_percent: product.discount_percent,
          gst_amount: +gst_amount.toFixed(2),
          discount_amount: +discount_amount.toFixed(2),
          subtotal: +subtotal.toFixed(2),
          weight_expected: product.weight_grams,
          verified: false,
        })
        .select()
        .single()
      if (error) throw error
      scannedItem = data
    }

    return ok({
      product: {
        id: product.id,
        name: product.name,
        price: product.price,
        gst_percent: product.gst_percent,
        discount_percent: product.discount_percent,
        weight_grams: product.weight_grams,
      },
      scanned_item: scannedItem,
    }, existingItem ? 200 : 201)
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Scan failed'
    return err(message, 500)
  }
}

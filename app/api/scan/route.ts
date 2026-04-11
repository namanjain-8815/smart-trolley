import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { ok, err } from '@/lib/apiHelpers'
import { getMode, setMode } from '@/lib/trolleyMode'

// ─── Special Mode Barcodes ────────────────────────────────────────────────────
// These barcodes switch the trolley mode instead of adding/removing a product.
const MODE_ADD_BARCODE    = 'MODE_ADD'    // Scan this barcode → ADD mode    (green)
const MODE_REMOVE_BARCODE = 'MODE_REMOVE' // Scan this barcode → REMOVE mode (red)

// POST /api/scan
// Body: { trolley_id, barcode }
// Handles ALL barcode scans: mode switches AND product scans.
// The ESP32 sends every scan to this single endpoint — mode logic is server-side.
export async function POST(req: NextRequest) {
  try {
    const { trolley_id, barcode } = await req.json()

    if (!trolley_id || !barcode) {
      return err('trolley_id and barcode are required')
    }

    // ── STEP 1: Intercept mode-switch barcodes ────────────────────────────────
    if (barcode === MODE_ADD_BARCODE) {
      setMode(trolley_id, 'ADD')
      return ok({ mode_switched: true, mode: 'ADD', message: 'Switched to ADD mode' })
    }

    if (barcode === MODE_REMOVE_BARCODE) {
      setMode(trolley_id, 'REMOVE')
      return ok({ mode_switched: true, mode: 'REMOVE', message: 'Switched to REMOVE mode' })
    }

    // ── STEP 2: Find active session ───────────────────────────────────────────
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('trolley_sessions')
      .select('id')
      .eq('trolley_id', trolley_id)
      .eq('status', 'active')
      .single()

    if (sessionError || !session) {
      return err(
        `No active session found for trolley ${trolley_id}. Please start a session first.`,
        404
      )
    }

    // ── STEP 3: Route to ADD or REMOVE based on current mode ─────────────────
    const currentMode = getMode(trolley_id)

    if (currentMode === 'REMOVE') {
      return handleRemove(session.id, barcode)
    }

    return handleAdd(session.id, barcode)

  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Scan failed'
    return err(message, 500)
  }
}

// ─── ADD: increment qty or insert new row ────────────────────────────────────
async function handleAdd(sessionId: string, barcode: string) {
  const { data: product, error: productError } = await supabaseAdmin
    .from('products')
    .select('*')
    .eq('barcode', barcode)
    .single()

  if (productError || !product) {
    return err(`Product with barcode ${barcode} not found in database.`, 404)
  }

  if (product.stock_qty <= 0) {
    return err(`Product "${product.name}" is out of stock.`, 400)
  }

  const { data: existingItem } = await supabaseAdmin
    .from('scanned_items')
    .select('id, quantity')
    .eq('session_id', sessionId)
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
    const base = product.price
    const discount_amount = (base * product.discount_percent) / 100
    const gst_amount = ((base - discount_amount) * product.gst_percent) / 100
    const subtotal = base - discount_amount + gst_amount

    const { data, error } = await supabaseAdmin
      .from('scanned_items')
      .insert({
        session_id: sessionId,
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

  return ok(
    {
      product: {
        id: product.id,
        name: product.name,
        price: product.price,
        gst_percent: product.gst_percent,
        discount_percent: product.discount_percent,
        weight_grams: product.weight_grams,
      },
      scanned_item: scannedItem,
      action: existingItem ? 'incremented' : 'added',
      mode: 'ADD',
    },
    existingItem ? 200 : 201
  )
}

// ─── REMOVE: decrement qty or delete row ─────────────────────────────────────
async function handleRemove(sessionId: string, barcode: string) {
  const { data: product, error: productError } = await supabaseAdmin
    .from('products')
    .select('*')
    .eq('barcode', barcode)
    .single()

  if (productError || !product) {
    return err(`Product with barcode ${barcode} not found in database.`, 404)
  }

  const { data: existingItem } = await supabaseAdmin
    .from('scanned_items')
    .select('id, quantity')
    .eq('session_id', sessionId)
    .eq('product_id', product.id)
    .single()

  if (!existingItem) {
    return err(`"${product.name}" is not in your cart.`, 404)
  }

  let scannedItem = null
  let action: 'decremented' | 'removed'

  if (existingItem.quantity > 1) {
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
}

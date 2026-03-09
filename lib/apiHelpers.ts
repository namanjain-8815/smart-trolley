// Reusable response helpers for API routes
import { NextResponse } from 'next/server'

export function ok(data: unknown, status = 200) {
  return NextResponse.json({ success: true, data }, { status })
}

export function err(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status })
}

// Calculate bill totals from scanned items
export function calculateBillTotals(items: {
  quantity: number
  unit_price: number
  gst_percent: number
  discount_percent: number
}[]) {
  let subtotal = 0
  let totalGst = 0
  let totalDiscount = 0

  for (const item of items) {
    const base = item.unit_price * item.quantity
    const discount = (base * item.discount_percent) / 100
    const afterDiscount = base - discount
    const gst = (afterDiscount * item.gst_percent) / 100
    subtotal += base
    totalDiscount += discount
    totalGst += gst
  }

  const grandTotal = subtotal - totalDiscount + totalGst
  return {
    subtotal: +subtotal.toFixed(2),
    totalDiscount: +totalDiscount.toFixed(2),
    totalGst: +totalGst.toFixed(2),
    grandTotal: +grandTotal.toFixed(2),
  }
}

// Generate UPI payment link
export function generateUpiLink(amount: number, sessionId: string) {
  const upiId = '8815987007@ybl'
  const storeName = encodeURIComponent('SmartStore')
  const note = encodeURIComponent(`Bill-${sessionId.slice(0, 8)}`)
  return `upi://pay?pa=${upiId}&pn=${storeName}&am=${amount.toFixed(2)}&cu=INR&tn=${note}`
}

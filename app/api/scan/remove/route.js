import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req) {
  try {
    const { trolley_id, barcode } = await req.json()

    // find active session
    const { data: session } = await supabaseAdmin
      .from('trolley_sessions')
      .select('id')
      .eq('trolley_id', trolley_id)
      .eq('status', 'active')
      .single()

    if (!session) {
      return Response.json({
        success: false,
        message: "No active session"
      }, { status: 404 })
    }

    // find product
    const { data: product } = await supabaseAdmin
      .from('products')
      .select('*')
      .eq('barcode', barcode)
      .single()

    if (!product) {
      return Response.json({
        success: false,
        message: "Product not found"
      }, { status: 404 })
    }

    // find scanned item
    const { data: item } = await supabaseAdmin
      .from('scanned_items')
      .select('*')
      .eq('session_id', session.id)
      .eq('product_id', product.id)
      .single()

    if (!item) {
      return Response.json({
        success: false,
        message: "Item not found"
      }, { status: 404 })
    }

    // qty >1 decrement
    if (item.quantity > 1) {

      await supabaseAdmin
        .from('scanned_items')
        .update({
          quantity: item.quantity - 1
        })
        .eq('id', item.id)

    } else {

      await supabaseAdmin
        .from('scanned_items')
        .delete()
        .eq('id', item.id)
    }

    return Response.json({
      success: true,
      product: {
        name: product.name,
        price: product.price
      }
    })

  } catch (error) {

    return Response.json({
      success: false,
      message: error.message
    }, { status: 500 })
  }
}

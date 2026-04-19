export async function POST(req) {
  try {
    const { trolley_id, barcode } = await req.json();

    if (!global.carts) global.carts = {};import { supabaseAdmin } from '@/lib/supabase'

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

    let cart = global.carts[trolley_id] || [];

    const index = cart.findIndex(
      item => item.barcode === barcode
    );

    if (index === -1) {
      return Response.json({
        success: false,
        message: "Item not found"
      }, { status: 404 });
    }

    const removedItem = cart[index];

    // quantity >1 then minus 1
    if (removedItem.quantity && removedItem.quantity > 1) {
      cart[index].quantity -= 1;
    } else {
      cart.splice(index, 1);
    }

    global.carts[trolley_id] = cart;

    return Response.json({
      success: true,
      message: "Item removed",
      product: {
        name: removedItem.name,
        price: removedItem.price,
        barcode: removedItem.barcode
      },
      cart
    });

  } catch (error) {
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

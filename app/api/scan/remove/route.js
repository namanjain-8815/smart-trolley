export async function POST(req) {
  try {
    const { trolley_id, barcode } = await req.json();

    if (!global.carts) global.carts = {};

    let cart = global.carts[trolley_id] || [];

    cart = cart.filter(item => item.barcode !== barcode);

    global.carts[trolley_id] = cart;

    return Response.json({
      success: true,
      message: "Item removed",
      cart: cart
    });

  } catch (error) {
    return Response.json({
      success: false,
      error: error.message
    });
  }
}

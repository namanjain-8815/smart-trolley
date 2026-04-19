export async function POST(req) {
  try {
    const { trolley_id, barcode } = await req.json();

    if (!global.carts) global.carts = {};

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

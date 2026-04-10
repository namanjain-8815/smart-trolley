import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { trolley_id, barcode } = await req.json();

    
    if (!(global as any).carts) {
      (global as any).carts = {};
    }

    const carts = (global as any).carts;

    let cart = carts[trolley_id] || [];

    // remove item by barcode
    const updatedCart = cart.filter(
      (item: any) => item.barcode !== barcode
    );

    carts[trolley_id] = updatedCart;

    return NextResponse.json({
      success: true,
      message: "Item removed",
      cart: updatedCart,
    });

  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}

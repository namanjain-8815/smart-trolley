import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { trolley_id, barcode } = await req.json();

    // 🔥 global cart storage (same as your scan API should use)
    // NOTE: This only works if scan API also uses global.carts
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

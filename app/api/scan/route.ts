import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { trolley_id, barcode, action } = await req.json();

    if (!(global as any).carts) {
      (global as any).carts = {};
    }

    const carts = (global as any).carts;

    if (!carts[trolley_id]) {
      carts[trolley_id] = [];
    }

    let cart = carts[trolley_id];

    // 🔍 find existing item
    let item = cart.find((i: any) => i.barcode === barcode);

    // ================= ADD =================
    if (!action || action === "add") {
      if (item) {
        item.quantity += 1;
      } else {
        cart.push({
          barcode,
          quantity: 1,
        });
      }
    }

    // ================= REMOVE =================
    if (action === "remove") {
      if (item) {
        item.quantity -= 1;

        // remove completely if qty = 0
        if (item.quantity <= 0) {
          cart = cart.filter((i: any) => i.barcode !== barcode);
        }
      }
    }

    carts[trolley_id] = cart;

    return NextResponse.json({
      success: true,
      cart,
    });

  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();

    const image = formData.get("image") as File | null;
    const trolley_id = formData.get("trolley_id") as string | null;
    const cart_count = Number(formData.get("cart_count") || 0);

    if (!image) {
      return NextResponse.json(
        { error: "No image uploaded" },
        { status: 400 }
      );
    }

    const bytes = await image.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");

    const response = await fetch(
      "https://serverless.roboflow.com/snikas-workspace/workflows/detect-count-and-visualize",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          api_key: "79cVq41jzxUFbmLltSOF",
          inputs: {
            image: {
              type: "base64",
              value: base64,
            },
          },
        }),
      }
    );

    const data = await response.json();

    const camera_count =
      data?.outputs?.[0]?.count_objects ?? 0;

    const mismatch = camera_count !== cart_count;

    return NextResponse.json({
      success: true,
      trolley_id,
      scanned_count: cart_count,
      camera_count,
      mismatch,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Server error" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const formData = await req.formData();

    const image = formData.get("image");
    const trolley_id = formData.get("trolley_id");
    const cart_count = Number(formData.get("cart_count") || 0);

    if (!image) {
      return NextResponse.json({ error: "No image uploaded" }, { status: 400 });
    }

    // convert image to base64
    const bytes = await image.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString("base64");

    // Roboflow API Call
    const rf = await fetch(
      "https://serverless.roboflow.com/snikas-workspace/workflows/detect-count-and-visualize",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          api_key: "YOUR_ROBOFLOW_API_KEY",
          inputs: {
            image: {
              type: "base64",
              value: base64
            }
          }
        })
      }
    );

    const data = await rf.json();

    let camera_count = 0;

    if (data.outputs && data.outputs[0]) {
      camera_count = data.outputs[0].count_objects || 0;
    }

    const mismatch = camera_count !== cart_count;

    return NextResponse.json({
      success: true,
      trolley_id,
      scanned_count: cart_count,
      camera_count,
      mismatch,
      roboflow: data
    });
  } catch (error) {
    return NextResponse.json({
      error: error.message
    });
  }
}

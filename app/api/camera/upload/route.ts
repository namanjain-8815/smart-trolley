import { NextResponse } from "next/server";
import { Buffer } from "buffer";

export const runtime = "nodejs";

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

    // Convert image to base64
    const bytes = await image.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");

    // Send image to Roboflow Workflow
    const rfResponse = await fetch(
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

    const rfData = await rfResponse.json();

    // Read detected count
    const camera_count =
      rfData?.outputs?.[0]?.count_objects ??
      rfData?.count_objects ??
      0;

    const mismatch = camera_count !== cart_count;

    return NextResponse.json({
      success: true,
      trolley_id,
      scanned_count: cart_count,
      camera_count,
      mismatch,
      roboflow_response: rfData,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Server Error",
      },
      { status: 500 }
    );
  }
}

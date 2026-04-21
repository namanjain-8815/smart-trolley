import { NextRequest } from 'next/server'

let latestImages: Record<string, string> = {}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData()

    const trolley_id =
      String(form.get('trolley_id'))

    const file =
      form.get('image') as File

    if (!file) {
      return Response.json({
        success: false,
        error: 'No image'
      })
    }

    const bytes =
      await file.arrayBuffer()

    const base64 =
      Buffer.from(bytes).toString(
        'base64'
      )

    latestImages[trolley_id] =
      `data:image/jpeg;base64,${base64}`

    return Response.json({
      success: true
    })

  } catch (e: any) {
    return Response.json({
      success: false,
      error: e.message
    })
  }
}

export async function GET(
  req: NextRequest
) {
  const trolley_id =
    req.nextUrl.searchParams.get(
      'trolley_id'
    ) || 'T002'

  return Response.json({
    success: true,
    image:
      latestImages[trolley_id] ||
      null
  })
}

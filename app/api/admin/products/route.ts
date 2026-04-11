import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { ok, err } from '@/lib/apiHelpers'

// GET single product by barcode
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const barcode = params.id;

    const { data, error } = await supabaseAdmin
      .from('products')
      .select('*')
      .eq('barcode', barcode)
      .single();

    if (error || !data) {
      return err('Not Found', 404);
    }

    return ok({
      name: data.name,
      price: data.price
    });

  } catch (e: unknown) {
    return err(
      e instanceof Error ? e.message : 'Failed to fetch product',
      500
    );
  }
}

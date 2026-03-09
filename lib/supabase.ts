import { createClient } from '@supabase/supabase-js'

// Use fallback dummy-but-valid URLs so createClient never throws at module-load
// time when .env.local hasn't been populated yet. Actual DB calls will fail
// gracefully inside the try-catch blocks of each API route.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-key'

// Browser client (uses anon key)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Server-side admin client (uses service role key - bypasses RLS)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

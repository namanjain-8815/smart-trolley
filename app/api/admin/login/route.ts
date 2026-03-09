import { NextRequest } from 'next/server'
import { verifyAdminCredentials, getAdminToken } from '@/lib/adminAuth'
import { ok, err } from '@/lib/apiHelpers'

// POST /api/admin/login
export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json()

    if (!username || !password) return err('Username and password are required')

    if (!verifyAdminCredentials(username, password)) {
      return err('Invalid credentials', 401)
    }

    return ok({ token: getAdminToken(), message: 'Login successful' })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Login failed'
    return err(message, 500)
  }
}

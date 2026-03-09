// Hardcoded admin credentials (server-side only)
const ADMIN_USERNAME = 'admin'
const ADMIN_PASSWORD = 'admin123'
const ADMIN_TOKEN = 'smarttrolley-admin-secret-token-2024'

export function verifyAdminCredentials(username: string, password: string): boolean {
  return username === ADMIN_USERNAME && password === ADMIN_PASSWORD
}

export function verifyAdminToken(token: string | null): boolean {
  return token === ADMIN_TOKEN
}

export function getAdminToken(): string {
  return ADMIN_TOKEN
}

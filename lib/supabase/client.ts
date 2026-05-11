import { createBrowserClient } from '@supabase/ssr'
import type { User } from '@supabase/supabase-js'

export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
)

function isInvalidRefreshTokenError(error: unknown) {
  if (!error || typeof error !== 'object') return false

  const message = 'message' in error ? String(error.message) : ''
  return message.toLowerCase().includes('invalid refresh token')
}

function clearAuthCookies() {
  if (typeof document === 'undefined') return

  document.cookie
    .split(';')
    .map(cookie => cookie.trim().split('=')[0])
    .filter(name => /^sb-.*-auth-token(?:\.\d+)?$/.test(name))
    .forEach(name => {
      document.cookie = `${name}=; Max-Age=0; path=/; SameSite=Lax`
    })
}

function clearAuthLocalStorage() {
  if (typeof window === 'undefined') return

  Object.keys(window.localStorage)
    .filter(key => /^sb-.*-auth-token$/.test(key) || key.startsWith('supabase.auth.'))
    .forEach(key => window.localStorage.removeItem(key))
}

export async function clearStaleAuthSession() {
  clearAuthCookies()
  clearAuthLocalStorage()
  await supabase.auth.signOut({ scope: 'local' }).catch(() => {})
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const { data, error } = await supabase.auth.getUser()

    if (error) {
      if (isInvalidRefreshTokenError(error)) {
        await clearStaleAuthSession()
      }
      return null
    }

    return data.user
  } catch (error) {
    if (isInvalidRefreshTokenError(error)) {
      await clearStaleAuthSession()
      return null
    }

    throw error
  }
}

import { supabase } from '@/integrations/supabase/client'

export type RoleName =
  | 'owner'
  | 'manager'
  | 'producer'
  | 'reviewer'
  | 'sales_service'
  | 'csr'

let cachedRoles: Set<RoleName> | null = null
let lastFetchedAt: number | null = null
const CACHE_TTL_MS = 60_000 // 1 minute cache

/**
 * Fetches current user's roles from user_roles table via RPC
 * Uses in-memory cache to avoid repeated calls
 */
export async function fetchMyRoles(): Promise<Set<RoleName>> {
  const now = Date.now()
  if (cachedRoles && lastFetchedAt && now - lastFetchedAt < CACHE_TTL_MS) {
    return cachedRoles
  }

  const { data, error } = await supabase.rpc('get_my_roles' as any)
  if (error) {
    console.error('get_my_roles RPC error:', error)
    // Fallback to empty set; caller may choose to degrade gracefully
    cachedRoles = new Set<RoleName>()
    lastFetchedAt = now
    return cachedRoles
  }

  const roles = new Set<RoleName>((data ?? []) as RoleName[])
  cachedRoles = roles
  lastFetchedAt = now
  return roles
}

/**
 * Checks if current user has a specific role
 * Uses fast RPC call, avoids fetching all roles
 */
export async function hasRole(role: RoleName): Promise<boolean> {
  // Cheap in-memory check first
  if (cachedRoles) {
    return cachedRoles.has(role)
  }

  // Ask server-side function (fast path, avoids fetching all)
  const { data, error } = await supabase.rpc('has_my_role' as any, { _role: role })
  if (error) {
    console.error('has_my_role RPC error:', error)
    // Degrade gracefully: if we cannot verify, return false
    return false
  }
  return Boolean(data)
}

/**
 * Ensures roles are loaded at least once
 * Call this before checking roles in components
 */
export async function ensureRolesLoaded(): Promise<Set<RoleName>> {
  return fetchMyRoles()
}

/**
 * Clears the role cache
 * Should be called on sign out to prevent stale data
 */
export function clearRolesCache(): void {
  cachedRoles = null
  lastFetchedAt = null
}

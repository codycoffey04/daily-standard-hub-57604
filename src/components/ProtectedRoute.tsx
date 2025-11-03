import { useAuth } from '@/contexts/AuthContext'
import { Navigate } from 'react-router-dom'
import { getRedirectPath, isOwnerManager } from '@/lib/auth'
import type { UserRole } from '@/lib/auth'
import { ensureRolesLoaded, fetchMyRoles } from '@/lib/roles'
import React from 'react'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiresOwnerManager?: boolean
  requiresRoles?: UserRole[]
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiresOwnerManager = false,
  requiresRoles
}) => {
  const { user, profile, loading } = useAuth()
  const [rolesReady, setRolesReady] = React.useState(false)
  const [hasRequiredRoles, setHasRequiredRoles] = React.useState<boolean | null>(null)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!user || !profile) {
    return <Navigate to="/login" replace />
  }

  // Phase 2: Evaluate roles via server; fallback to profile.role during transition
  React.useEffect(() => {
    // Early exit if no auth data (prevents calls during sign out)
    if (!user || !profile) {
      setRolesReady(true)
      setHasRequiredRoles(true)
      return
    }

    let mounted = true
    ;(async () => {
      try {
        await ensureRolesLoaded()
        const myRoles = await fetchMyRoles()
        if (!mounted) return // Check before any setState

        if (requiresOwnerManager) {
          // Check both server roles and legacy profile.role for safety
          const isMgrOwner =
            myRoles.has('manager') || myRoles.has('owner') || isOwnerManager(profile)
          if (!isMgrOwner) {
            if (!mounted) return // Double check before setState
            setHasRequiredRoles(false)
            setRolesReady(true)
            return
          }
        }

        if (requiresRoles && requiresRoles.length > 0) {
          // Check both server roles and legacy profile.role
          const okServer = requiresRoles.some(r => myRoles.has(r as any))
          const okProfile = requiresRoles.includes(profile.role as UserRole)
          if (!mounted) return // Check before setState
          setHasRequiredRoles(okServer || okProfile)
        } else {
          if (!mounted) return // Check before setState
          setHasRequiredRoles(true)
        }
        if (!mounted) return // Check before setState
        setRolesReady(true)
      } catch (error) {
        // On error, degrade to profile-based checks
        console.error('Error checking roles:', error)
        if (!mounted) return // CRITICAL: Check before setState in catch
        
        if (requiresOwnerManager && !isOwnerManager(profile)) {
          setHasRequiredRoles(false)
        } else if (requiresRoles && requiresRoles.length > 0) {
          setHasRequiredRoles(requiresRoles.includes(profile.role as UserRole))
        } else {
          setHasRequiredRoles(true)
        }
        setRolesReady(true)
      }
    })()
    return () => {
      mounted = false
    }
  }, [user, profile, requiresOwnerManager, requiresRoles]) // Added 'user' to deps

  if (!rolesReady || hasRequiredRoles === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!hasRequiredRoles) {
    return <Navigate to={getRedirectPath(profile)} replace />
  }

  return <>{children}</>
}

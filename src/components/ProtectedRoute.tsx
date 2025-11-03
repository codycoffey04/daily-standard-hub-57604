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

  // ✅ HOOK RUNS FIRST - before any conditional returns
  React.useEffect(() => {
    let mounted = true
    
    // Handle early exit inside the hook, not before it
    if (!user || !profile || loading) {
      setRolesReady(true)
      setHasRequiredRoles(false)
      return
    }

    ;(async () => {
      try {
        await ensureRolesLoaded()
        const myRoles = await fetchMyRoles()
        if (!mounted) return

        if (requiresOwnerManager) {
          const isMgrOwner =
            myRoles.has('manager') || myRoles.has('owner') || isOwnerManager(profile)
          if (!isMgrOwner) {
            if (!mounted) return
            setHasRequiredRoles(false)
            setRolesReady(true)
            return
          }
        }

        if (requiresRoles && requiresRoles.length > 0) {
          const okServer = requiresRoles.some(r => myRoles.has(r as any))
          const okProfile = requiresRoles.includes(profile.role as UserRole)
          if (!mounted) return
          setHasRequiredRoles(okServer || okProfile)
        } else {
          if (!mounted) return
          setHasRequiredRoles(true)
        }
        if (!mounted) return
        setRolesReady(true)
      } catch (error) {
        if (!mounted) return
        console.error('Error checking roles:', error)
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
  }, [user, profile, loading, requiresOwnerManager, requiresRoles])

  // ✅ NOW conditional returns are safe - all hooks have already run
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

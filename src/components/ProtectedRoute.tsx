import { useAuth } from '@/contexts/AuthContext'
import { Navigate } from 'react-router-dom'
import { getRedirectPath, isOwnerManager } from '@/lib/auth'
import type { UserRole } from '@/lib/auth'

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

  if (requiresOwnerManager && !isOwnerManager(profile)) {
    return <Navigate to="/producer" replace />
  }

  if (requiresRoles && !requiresRoles.includes(profile.role as UserRole)) {
    return <Navigate to={getRedirectPath(profile)} replace />
  }

  return <>{children}</>
}
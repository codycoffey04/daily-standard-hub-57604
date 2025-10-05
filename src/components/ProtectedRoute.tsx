import { useAuth } from '@/contexts/AuthContext'
import { Navigate } from 'react-router-dom'
import { isOwnerManager } from '@/lib/auth'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiresOwnerManager?: boolean
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiresOwnerManager = false 
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

  return <>{children}</>
}
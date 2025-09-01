import React from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { LogOut } from 'lucide-react'

interface AppHeaderProps {
  sidebarCollapsed: boolean
}

export const AppHeader: React.FC<AppHeaderProps> = ({ sidebarCollapsed }) => {
  const { profile, signOut } = useAuth()

  return (
    <header className="h-16 bg-card border-b border-border shadow-sm flex items-center justify-end px-6">
      <div className="flex items-center space-x-4">
        <div className="text-right">
          <div className="text-sm font-medium text-foreground">
            {profile?.display_name}
          </div>
          <div className="text-xs text-muted-foreground capitalize">
            {profile?.role}
          </div>
        </div>
        <Button 
          variant="outline" 
          size="sm"
          onClick={signOut}
          className="flex items-center space-x-1"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Sign Out</span>
        </Button>
      </div>
    </header>
  )
}
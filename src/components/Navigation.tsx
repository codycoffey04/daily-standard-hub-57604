import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { 
  Calendar, 
  Users, 
  CheckCircle, 
  Settings, 
  BarChart, 
  Upload, 
  LogOut, 
  Home,
  ClipboardCheck,
  Database
} from 'lucide-react'
import { isOwnerManager } from '@/lib/auth'

export const Navigation: React.FC = () => {
  const { profile, signOut } = useAuth()
  const location = useLocation()

  const isActive = (path: string) => location.pathname === path

  const navigationItems = [
    { 
      href: '/home', 
      label: 'Home', 
      icon: Home,
      allowedRoles: ['owner', 'manager', 'producer']
    },
    { 
      href: '/team', 
      label: 'Team', 
      icon: Users,
      allowedRoles: ['owner', 'manager']
    },
    { 
      href: '/reviews', 
      label: 'Reviews', 
      icon: CheckCircle,
      allowedRoles: ['owner', 'manager']
    },
    { 
      href: '/accountability', 
      label: 'Accountability', 
      icon: ClipboardCheck,
      allowedRoles: ['owner', 'manager', 'reviewer']
    },
    { 
      href: '/sources', 
      label: 'Sources', 
      icon: Settings,
      allowedRoles: ['owner', 'manager']
    },
    { 
      href: '/summaries', 
      label: 'Summaries', 
      icon: BarChart,
      allowedRoles: ['owner', 'manager']
    },
    { 
      href: '/importer', 
      label: 'Importer', 
      icon: Upload,
      allowedRoles: ['owner', 'manager']
    },
    { 
      href: '/admin/reviews', 
      label: 'Admin Reviews', 
      icon: Database,
      allowedRoles: ['owner', 'manager']
    }
  ]

  const visibleItems = navigationItems.filter(item => 
    item.allowedRoles.includes(profile?.role || '')
  )

  return (
    <nav className="bg-card border-b shadow-soft">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center space-x-8">
            {/* Logo */}
            <div className="flex items-center space-x-2">
              <Calendar className="h-6 w-6 text-primary" />
              <span className="text-xl font-semibold text-foreground">
                The Daily Standard
              </span>
            </div>

            {/* Navigation Links */}
            <div className="hidden md:flex space-x-4">
              {visibleItems.map(item => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive(item.href)
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </div>
          </div>

          {/* User Info & Sign Out */}
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
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="md:hidden border-t">
        <div className="px-2 py-3 space-y-1">
          {visibleItems.map(item => {
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                to={item.href}
                className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive(item.href)
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
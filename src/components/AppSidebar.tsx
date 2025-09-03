import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { 
  Calendar, 
  Users, 
  Settings, 
  BarChart, 
  Upload, 
  ClipboardCheck,
  Database,
  Menu,
  X
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface AppSidebarProps {
  collapsed: boolean
  onToggle: () => void
}

export const AppSidebar: React.FC<AppSidebarProps> = ({ collapsed, onToggle }) => {
  const { profile } = useAuth()
  const location = useLocation()

  const isActive = (path: string) => location.pathname === path

  const navigationItems = [
    { 
      href: '/team', 
      label: 'Team', 
      icon: Users,
      allowedRoles: ['owner', 'manager']
    },
    { 
      href: '/summaries', 
      label: 'Summaries', 
      icon: BarChart,
      allowedRoles: ['owner', 'manager']
    },
    { 
      href: '/accountability', 
      label: 'Accountability', 
      icon: ClipboardCheck,
      allowedRoles: ['owner', 'manager', 'reviewer']
    },
    { 
      href: '/admin/reviews', 
      label: 'Admin Reviews', 
      icon: Database,
      allowedRoles: ['owner', 'manager']
    },
    { 
      href: '/sources', 
      label: 'Sources', 
      icon: Settings,
      allowedRoles: ['owner', 'manager']
    },
    { 
      href: '/importer', 
      label: 'Importer', 
      icon: Upload,
      allowedRoles: ['owner', 'manager']
    }
  ]

  const visibleItems = navigationItems.filter(item => 
    item.allowedRoles.includes(profile?.role || '')
  )

  if (collapsed) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={onToggle}
        className="fixed top-4 left-4 z-50 h-10 w-10 p-0 bg-background shadow-lg border-border hover:bg-accent"
      >
        <Menu className="h-4 w-4" />
      </Button>
    )
  }

  return (
    <>
      {/* Mobile Overlay */}
      <div 
        className="fixed inset-0 z-30 bg-black/50 md:hidden"
        onClick={onToggle}
      />
      
      {/* Sidebar */}
      <div className="fixed left-0 top-0 z-40 h-full w-64 bg-slate-900 text-white shadow-xl transform transition-transform duration-300 ease-in-out">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <div className="flex items-center space-x-3">
            <Calendar className="h-6 w-6 text-blue-400" />
            <span className="text-lg font-semibold">The Daily Standard</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            className="h-8 w-8 p-0 text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-2">
          {visibleItems.map(item => {
            const Icon = item.icon
            const active = isActive(item.href)
            
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                  active
                    ? "bg-blue-600 text-white"
                    : "text-slate-300 hover:text-white hover:bg-slate-800"
                )}
              >
                <Icon className="h-5 w-5" />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>
      </div>
    </>
  )
}
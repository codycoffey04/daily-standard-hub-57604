import React from 'react'
import { ChevronDown, ChevronRight, Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { reportCategories, type ReportConfig } from '@/config/reportConfig'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { ensureRolesLoaded, fetchMyRoles } from '@/lib/roles'

interface ReportSidebarProps {
  activeReportId: string
  onReportChange: (reportId: string) => void
  expandedCategories: Set<string>
  onCategoryToggle: (categoryId: string) => void
  collapsed: boolean
  onToggle: () => void
}

export const ReportSidebar: React.FC<ReportSidebarProps> = ({
  activeReportId,
  onReportChange,
  expandedCategories,
  onCategoryToggle,
  collapsed,
  onToggle
}) => {
  const { profile } = useAuth()
  
  const handleReportClick = (report: ReportConfig) => {
    onReportChange(report.id)
  }

  const [hasSalesService, setHasSalesService] = React.useState<boolean | null>(null)
  
  React.useEffect(() => {
    // Early exit if no profile (prevents calls during sign out)
    if (!profile) {
      setHasSalesService(null)
      return
    }

    let mounted = true
    ;(async () => {
      try {
        await ensureRolesLoaded()
        const roles = await fetchMyRoles()
        if (!mounted) return // Check before setState
        setHasSalesService(roles.has('sales_service'))
      } catch (error) {
        console.error('Error loading roles for report sidebar:', error)
        if (!mounted) return // Check before setState in catch
        setHasSalesService(null)
      }
    })()
    return () => {
      mounted = false
    }
  }, []) // Empty deps - only run once on mount

  // Filter categories based on role - hide Lead Source Analysis from managers and sales_service
  const visibleCategories = reportCategories.filter(category => {
    // Keep existing manager rule (legacy profile.role)
    if (category.id === 'lead-source-analysis' && profile?.role === 'manager') {
      return false
    }
    // Also hide for sales_service once roles are known
    if (hasSalesService === true && category.id === 'lead-source-analysis') {
      return false
    }
    return true
  })

  // Floating toggle button when sidebar is collapsed
  if (collapsed) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={onToggle}
              className="fixed top-20 left-4 z-50 h-10 w-10 p-0 bg-background shadow-lg border-border hover:bg-accent animate-fade-in"
            >
              <Menu className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>Show sidebar</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return (
    <div className="w-80 bg-sidebar border-r border-sidebar-border h-full flex flex-col transition-all duration-300 ease-in-out animate-slide-in-right">
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-sidebar-foreground">
              Reports & Analytics
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Select a report to view detailed analysis
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            className="h-8 w-8 p-0 ml-2"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2">
          {visibleCategories.map((category, categoryIndex) => {
            const isExpanded = expandedCategories.has(category.id)
            
            return (
              <div key={category.id} className="mb-2">
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full justify-between text-left font-medium py-2 px-3",
                    "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                  onClick={() => onCategoryToggle(category.id)}
                >
                  <span className="text-sm">{category.title}</span>
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>
                
                {isExpanded && (
                  <div className="ml-2 mt-1 space-y-1">
                    {category.reports.map((report) => {
                      const isActive = activeReportId === report.id
                      const Icon = report.icon
                      
                      return (
                        <TooltipProvider key={report.id}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                className={cn(
                                  "w-full justify-start text-left py-2 px-3 h-auto",
                                  isActive 
                                    ? "bg-sidebar-primary text-sidebar-primary-foreground" 
                                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                                )}
                                onClick={() => handleReportClick(report)}
                              >
                                <Icon className="h-4 w-4 mr-3 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-medium" title={report.title}>
                                    {report.title}
                                  </div>
                                </div>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="right" className="max-w-xs">
                              <div className="font-medium">{report.title}</div>
                              <div className="text-xs mt-1 opacity-75">{report.description}</div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )
                    })}
                  </div>
                )}
                
                {categoryIndex < visibleCategories.length - 1 && (
                  <Separator className="my-3" />
                )}
              </div>
            )
          })}
        </div>
      </ScrollArea>
    </div>
  )
}
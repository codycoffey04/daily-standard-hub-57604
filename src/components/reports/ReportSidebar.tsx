import React from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { reportCategories, type ReportConfig } from '@/config/reportConfig'
import { cn } from '@/lib/utils'

interface ReportSidebarProps {
  activeReportId: string
  onReportChange: (reportId: string) => void
  expandedCategories: Set<string>
  onCategoryToggle: (categoryId: string) => void
}

export const ReportSidebar: React.FC<ReportSidebarProps> = ({
  activeReportId,
  onReportChange,
  expandedCategories,
  onCategoryToggle
}) => {
  const handleReportClick = (report: ReportConfig) => {
    onReportChange(report.id)
  }

  return (
    <div className="w-72 bg-sidebar border-r border-sidebar-border h-full flex flex-col">
      <div className="p-4 border-b border-sidebar-border">
        <h2 className="text-lg font-semibold text-sidebar-foreground">
          Reports & Analytics
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Select a report to view detailed analysis
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2">
          {reportCategories.map((category, categoryIndex) => {
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
                                  <div className="text-sm font-medium truncate">
                                    {report.title}
                                  </div>
                                  <div className="text-xs opacity-75 mt-0.5 line-clamp-2">
                                    {report.description}
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
                
                {categoryIndex < reportCategories.length - 1 && (
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
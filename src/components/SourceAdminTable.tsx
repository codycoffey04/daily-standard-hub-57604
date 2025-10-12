import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Edit, Trash } from 'lucide-react'

interface SourceAdminTableProps {
  sources: any[]
  loading: boolean
  onSourcesChanged: () => void
  onEditSource: (source: any) => void
  onAddSource: () => void
}

export const SourceAdminTable: React.FC<SourceAdminTableProps> = ({ 
  sources, 
  loading, 
  onSourcesChanged,
  onEditSource,
  onAddSource
}) => {
  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Lead Sources</CardTitle>
            <CardDescription>Manage active lead sources and their configuration</CardDescription>
          </div>
            <Button size="sm" onClick={onAddSource}>
              <Plus className="h-4 w-4 mr-1" />
              Add Source
            </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2">Name</th>
                <th className="text-center p-2">Status</th>
                <th className="text-center p-2">Sort Order</th>
                <th className="text-center p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sources.map(source => (
                <tr key={source.id} className="border-b">
                  <td className="p-2 font-medium">{source.name}</td>
                  <td className="p-2 text-center">
                    <Badge variant={source.active ? 'default' : 'secondary'}>
                      {source.active ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="p-2 text-center">{source.sort_order}</td>
                  <td className="p-2 text-center">
                    <div className="flex justify-center space-x-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => onEditSource(source)}
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                      <Button size="sm" variant="outline">
                        <Trash className="h-3 w-3" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
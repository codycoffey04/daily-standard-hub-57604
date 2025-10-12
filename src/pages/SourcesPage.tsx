import React, { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { SourceAdminTable } from '@/components/SourceAdminTable'
import { SourceEditModal } from '@/components/SourceEditModal'
import { Settings, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

const SourcesPage: React.FC = () => {
  const { profile } = useAuth()
  const [loading, setLoading] = useState(true)
  const [sources, setSources] = useState<any[]>([])
  const [editingSource, setEditingSource] = useState<any | null>(null)

  useEffect(() => {
    loadSources()
  }, [])

  const loadSources = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('sources')
        .select('*')
        .order('sort_order')

      if (error) {
        console.error('Error loading sources:', error)
        return
      }

      setSources(data || [])
    } catch (error) {
      console.error('Error loading sources:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSourcesChanged = () => {
    loadSources() // Refresh after changes
  }
  
  const handleEditSource = (source: any) => {
    setEditingSource(source)
  }
  
  const handleAddSource = () => {
    setEditingSource({
      id: null,
      name: '',
      active: true,
      sort_order: 100
    })
  }
  
  const handleCloseModal = () => {
    setEditingSource(null)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 mb-2">
              <Settings className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-3xl font-bold text-foreground">Sources Management</h1>
                <p className="text-muted-foreground">
                  Manage lead sources and their settings
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Sources Admin Table */}
        <SourceAdminTable 
          sources={sources}
          loading={loading}
          onSourcesChanged={handleSourcesChanged}
          onEditSource={handleEditSource}
          onAddSource={handleAddSource}
        />
        
        {/* Source Edit Modal */}
        {editingSource && (
          <SourceEditModal
            source={editingSource}
            isOpen={!!editingSource}
            onClose={handleCloseModal}
            onSaved={handleSourcesChanged}
          />
        )}
      </div>
  )
}

export default SourcesPage
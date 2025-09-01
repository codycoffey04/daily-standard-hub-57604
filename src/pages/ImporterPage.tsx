import React, { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CSVImporter } from '@/components/CSVImporter'
import { Upload, AlertTriangle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

const ImporterPage: React.FC = () => {
  const { profile } = useAuth()

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <Upload className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">CSV Importer</h1>
          </div>
          <p className="text-muted-foreground">
            Import historical or batch daily entry data via CSV upload
          </p>
        </div>

        {/* Warning Notice */}
        <Alert className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Admin Only:</strong> This tool is for owner/manager use only. 
            Import validates all data against business rules and source configurations.
          </AlertDescription>
        </Alert>

        {/* CSV Importer Component */}
        <CSVImporter />
      </div>
  )
}

export default ImporterPage
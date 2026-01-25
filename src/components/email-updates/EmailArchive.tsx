import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { Eye, Copy, Check, Calendar, Clock, Mail } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useEmailArchive } from '@/hooks/useEmailGeneration'

export const EmailArchive: React.FC = () => {
  const { data: emails, isLoading, error } = useEmailArchive()
  const { toast } = useToast()
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [selectedEmail, setSelectedEmail] = useState<{
    id: string
    subject_line: string
    html_content: string
    markdown_content: string
  } | null>(null)

  const copyHtml = async (email: { id: string; html_content: string }) => {
    try {
      await navigator.clipboard.writeText(email.html_content)
      setCopiedId(email.id)
      setTimeout(() => setCopiedId(null), 2000)
      toast({
        title: 'Copied',
        description: 'HTML content copied to clipboard.'
      })
    } catch (err) {
      toast({
        title: 'Copy failed',
        description: 'Failed to copy to clipboard.',
        variant: 'destructive'
      })
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>Error loading archive: {error.message}</p>
      </div>
    )
  }

  if (!emails || emails.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Mail className="h-12 w-12 mx-auto mb-4 opacity-30" />
        <p className="text-lg font-medium">No emails generated yet</p>
        <p className="text-sm mt-1">Generated emails will appear here.</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Type</TableHead>
            <TableHead>Period</TableHead>
            <TableHead>Subject</TableHead>
            <TableHead>Generated</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {emails.map((email) => (
            <TableRow key={email.id}>
              <TableCell>
                <Badge variant={email.email_type === 'weekly' ? 'default' : 'secondary'}>
                  {email.email_type === 'weekly' ? 'Weekly' : 'Monthly'}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>{formatDate(email.period_start)}</span>
                </div>
              </TableCell>
              <TableCell className="max-w-[300px] truncate">
                {email.subject_line}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Clock className="h-3 w-3" />
                  <span>{formatTimestamp(email.created_at)}</span>
                </div>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedEmail(email)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>{email.subject_line}</DialogTitle>
                      </DialogHeader>
                      <div
                        className="bg-white p-4 rounded border overflow-x-auto"
                        dangerouslySetInnerHTML={{ __html: email.html_content }}
                      />
                    </DialogContent>
                  </Dialog>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyHtml(email)}
                  >
                    {copiedId === email.id ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {emails.length >= 50 && (
        <p className="text-xs text-muted-foreground text-center">
          Showing last 50 emails
        </p>
      )}
    </div>
  )
}

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Copy, Download, Check, Eye, Code } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface EmailPreviewProps {
  subjectLine: string
  htmlContent: string
  markdownContent: string
}

export const EmailPreview: React.FC<EmailPreviewProps> = ({
  subjectLine,
  htmlContent,
  markdownContent
}) => {
  const { toast } = useToast()
  const [copiedHtml, setCopiedHtml] = useState(false)
  const [copiedMarkdown, setCopiedMarkdown] = useState(false)

  const copyToClipboard = async (content: string, type: 'html' | 'markdown') => {
    try {
      await navigator.clipboard.writeText(content)

      if (type === 'html') {
        setCopiedHtml(true)
        setTimeout(() => setCopiedHtml(false), 2000)
      } else {
        setCopiedMarkdown(true)
        setTimeout(() => setCopiedMarkdown(false), 2000)
      }

      toast({
        title: 'Copied to clipboard',
        description: `${type === 'html' ? 'HTML' : 'Markdown'} content copied.`
      })
    } catch (err) {
      toast({
        title: 'Copy failed',
        description: 'Failed to copy to clipboard.',
        variant: 'destructive'
      })
    }
  }

  const downloadHtml = () => {
    const blob = new Blob([htmlContent], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `team-update-${new Date().toISOString().split('T')[0]}.html`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    toast({
      title: 'Downloaded',
      description: 'HTML file downloaded.'
    })
  }

  return (
    <div className="space-y-4">
      {/* Subject Line */}
      <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
        <div>
          <span className="text-xs text-muted-foreground">Subject:</span>
          <p className="font-medium">{subjectLine}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => copyToClipboard(subjectLine, 'markdown')}
        >
          <Copy className="h-4 w-4 mr-2" />
          Copy Subject
        </Button>
      </div>

      {/* Content Tabs */}
      <Tabs defaultValue="preview" className="w-full">
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="preview" className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Preview
            </TabsTrigger>
            <TabsTrigger value="html" className="flex items-center gap-2">
              <Code className="h-4 w-4" />
              HTML
            </TabsTrigger>
            <TabsTrigger value="markdown" className="flex items-center gap-2">
              <Code className="h-4 w-4" />
              Markdown
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => copyToClipboard(htmlContent, 'html')}
            >
              {copiedHtml ? (
                <>
                  <Check className="h-4 w-4 mr-2 text-green-600" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy HTML
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={downloadHtml}
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </div>
        </div>

        <TabsContent value="preview" className="mt-0">
          <div className="border rounded-lg overflow-hidden bg-white">
            <div
              className="p-6 max-h-[600px] overflow-y-auto"
              dangerouslySetInnerHTML={{ __html: htmlContent }}
            />
          </div>
        </TabsContent>

        <TabsContent value="html" className="mt-0">
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-2 right-2"
              onClick={() => copyToClipboard(htmlContent, 'html')}
            >
              {copiedHtml ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
            </Button>
            <pre className="bg-muted p-4 rounded-lg overflow-x-auto max-h-[500px] text-xs">
              <code>{htmlContent}</code>
            </pre>
          </div>
        </TabsContent>

        <TabsContent value="markdown" className="mt-0">
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-2 right-2"
              onClick={() => copyToClipboard(markdownContent, 'markdown')}
            >
              {copiedMarkdown ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
            </Button>
            <pre className="bg-muted p-4 rounded-lg overflow-x-auto max-h-[500px] text-sm whitespace-pre-wrap">
              {markdownContent}
            </pre>
          </div>
        </TabsContent>
      </Tabs>

      <p className="text-xs text-muted-foreground text-center">
        Copy the HTML and paste directly into Outlook. Tables are styled inline for compatibility.
      </p>
    </div>
  )
}

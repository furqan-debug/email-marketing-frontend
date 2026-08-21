'use client'

import { useEffect, useState } from 'react'
import { 
  FileCode2, 
  PlusCircle, 
  Trash2, 
  Edit3, 
  RefreshCw, 
  AlertCircle, 
  Eye, 
  Code2, 
  Save, 
  Check, 
  Loader2, 
  Sparkles 
} from 'lucide-react'
import { getTemplates, getTemplate, createTemplate, updateTemplate, deleteTemplate } from '@/lib/api'
import type { Template } from '@/lib/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

const DEFAULT_SAMPLE_HTML = `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; }
    .container { max-width: 580px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 32px; }
    .header { text-align: center; border-bottom: 1px solid #edf2f7; padding-bottom: 20px; margin-bottom: 24px; }
    .header h1 { color: #2b6cb0; margin: 0; font-size: 24px; }
    .button { display: inline-block; padding: 12px 24px; background-color: #3182ce; color: #ffffff !important; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 20px; }
    .footer { text-align: center; font-size: 12px; color: #718096; margin-top: 32px; border-top: 1px solid #edf2f7; padding-top: 16px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Hello {{first_name}}!</h1>
    </div>
    <p>We are thrilled to bring you our latest updates and special announcements.</p>
    <p>Check out our newly launched features and platform enhancements:</p>
    <p style="text-align: center;">
      <a href="https://example.com/explore" class="button">Explore New Features</a>
    </p>
    <div class="footer">
      <p>Sent to {{email}} &middot; All rights reserved</p>
    </div>
  </div>
</body>
</html>`

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Editor State
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [name, setName] = useState('')
  const [subject, setSubject] = useState('')
  const [html, setHtml] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [editorError, setEditorError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function loadTemplatesList() {
    setLoading(true)
    setError(null)
    try {
      const list = await getTemplates()
      setTemplates(list || [])
    } catch (err: any) {
      setError(err.message || 'Failed to load templates')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTemplatesList()
  }, [])

  function handleStartNew() {
    setSelectedId(null)
    setIsEditing(true)
    setName('')
    setSubject('')
    setHtml(DEFAULT_SAMPLE_HTML)
    setSaveSuccess(false)
    setEditorError(null)
  }

  async function handleSelectTemplate(id: string) {
    setSelectedId(id)
    setIsEditing(true)
    setSaveSuccess(false)
    setEditorError(null)
    try {
      const full = await getTemplate(id)
      setName(full.name || '')
      setSubject(full.subject || '')
      setHtml(full.html || '')
    } catch (err: any) {
      setEditorError(err.message || 'Failed to load template details')
    }
  }

  async function handleSaveTemplate(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !html.trim()) return

    setSaving(true)
    setEditorError(null)
    setSaveSuccess(false)

    try {
      if (selectedId) {
        // Update
        const updated = await updateTemplate(selectedId, {
          name: name.trim(),
          subject: subject.trim() || undefined,
          html,
        })
        setSaveSuccess(true)
      } else {
        // Create
        const created = await createTemplate({
          name: name.trim(),
          subject: subject.trim() || undefined,
          html,
        })
        setSelectedId(created.id)
        setSaveSuccess(true)
      }
      await loadTemplatesList()
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err: any) {
      setEditorError(err.message || 'Failed to save template')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteTemplate(id: string, e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!confirm('Are you sure you want to delete this template?')) return

    setDeletingId(id)
    try {
      await deleteTemplate(id)
      if (selectedId === id) {
        setIsEditing(false)
        setSelectedId(null)
      }
      await loadTemplatesList()
    } catch (err: any) {
      alert(err.message || 'Failed to delete template')
    } finally {
      setDeletingId(null)
    }
  }

  function insertTag(tag: string) {
    setHtml(prev => prev + tag)
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Templates</h1>
          <p className="text-muted-foreground mt-1">
            Design and preview responsive HTML email templates with dynamic merge tags
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadTemplatesList} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button size="sm" onClick={handleStartNew}>
            <PlusCircle className="h-4 w-4 mr-2" />
            New Template
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Main Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side: Templates List (4 cols) */}
        <Card className="lg:col-span-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Saved Templates</CardTitle>
            <CardDescription>
              {templates.length} template{templates.length === 1 ? '' : 's'} available
            </CardDescription>
          </CardHeader>
          <CardContent className="p-2">
            {loading ? (
              <div className="space-y-2 p-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : templates.length === 0 ? (
              <div className="text-center py-8 px-4 border border-dashed rounded-lg m-2">
                <FileCode2 className="mx-auto h-6 w-6 text-muted-foreground/60 mb-2" />
                <p className="text-xs font-medium text-foreground">No templates yet</p>
                <Button size="sm" variant="outline" className="mt-3 text-xs" onClick={handleStartNew}>
                  Create your first template
                </Button>
              </div>
            ) : (
              <div className="space-y-1">
                {templates.map((tpl) => {
                  const isSelected = selectedId === tpl.id
                  return (
                    <div
                      key={tpl.id}
                      onClick={() => handleSelectTemplate(tpl.id)}
                      className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all border ${
                        isSelected 
                          ? 'bg-primary/5 border-primary shadow-xs' 
                          : 'hover:bg-muted/60 border-transparent'
                      }`}
                    >
                      <div className="min-w-0 flex-1 pr-2">
                        <p className="font-semibold text-sm truncate text-foreground">{tpl.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {tpl.subject || 'No default subject'}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          disabled={deletingId === tpl.id}
                          onClick={(e) => handleDeleteTemplate(tpl.id, e)}
                        >
                          {deletingId === tpl.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right Side: Editor & Live Preview Panel (8 cols) */}
        <div className="lg:col-span-8">
          {!isEditing ? (
            <Card className="border-dashed py-16 text-center">
              <CardContent className="space-y-3">
                <FileCode2 className="mx-auto h-12 w-12 text-muted-foreground/40" />
                <h3 className="text-lg font-semibold">Select a Template or Create New</h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Pick a template from the list on the left to edit, or click below to build a brand new responsive email.
                </p>
                <Button onClick={handleStartNew} className="mt-2">
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Create Template
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="shadow-md">
              <form onSubmit={handleSaveTemplate}>
                <CardHeader className="pb-4 border-b">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <CardTitle className="text-lg">
                        {selectedId ? `Edit Template: ${name}` : 'New Email Template'}
                      </CardTitle>
                      <CardDescription>
                        Edit HTML code and view real-time rendered output
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="submit"
                        disabled={saving || !name.trim() || !html.trim()}
                        size="sm"
                      >
                        {saving ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving...
                          </>
                        ) : saveSuccess ? (
                          <>
                            <Check className="mr-2 h-4 w-4 text-emerald-400" />
                            Saved!
                          </>
                        ) : (
                          <>
                            <Save className="mr-2 h-4 w-4" />
                            Save Template
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4 pt-4">
                  {editorError && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{editorError}</AlertDescription>
                    </Alert>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="templateName">Template Name *</Label>
                      <Input
                        id="templateName"
                        placeholder="e.g. Welcome Series, August Newsletter"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="templateSubject">Default Subject Line</Label>
                      <Input
                        id="templateSubject"
                        placeholder="e.g. Welcome aboard, {{first_name}}!"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Merge Tags Helper */}
                  <div className="flex items-center gap-2 flex-wrap text-xs bg-muted/40 p-2.5 rounded-lg border">
                    <span className="font-semibold text-muted-foreground">Insert Merge Tags:</span>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      className="h-6 text-xs px-2"
                      onClick={() => insertTag('{{first_name}}')}
                    >
                      &#123;&#123;first_name&#125;&#125;
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      className="h-6 text-xs px-2"
                      onClick={() => insertTag('{{last_name}}')}
                    >
                      &#123;&#123;last_name&#125;&#125;
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      className="h-6 text-xs px-2"
                      onClick={() => insertTag('{{email}}')}
                    >
                      &#123;&#123;email&#125;&#125;
                    </Button>
                  </div>

                  {/* Editor & Preview Tabs */}
                  <Tabs defaultValue="editor" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="editor" className="flex items-center gap-2">
                        <Code2 className="h-4 w-4" />
                        HTML Source
                      </TabsTrigger>
                      <TabsTrigger value="preview" className="flex items-center gap-2">
                        <Eye className="h-4 w-4" />
                        Live Preview
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="editor" className="mt-3">
                      <Textarea
                        value={html}
                        onChange={(e) => setHtml(e.target.value)}
                        placeholder="<html><body>...</body></html>"
                        className="font-mono text-xs min-h-[420px] bg-slate-950 text-slate-50 p-4 rounded-lg focus-visible:ring-1 leading-relaxed"
                        spellCheck={false}
                      />
                    </TabsContent>

                    <TabsContent value="preview" className="mt-3">
                      <div className="border rounded-lg bg-white overflow-hidden shadow-inner min-h-[420px]">
                        <iframe
                          srcDoc={html.replace(/\{\{first_name\}\}/g, 'Alex').replace(/\{\{last_name\}\}/g, 'Smith').replace(/\{\{email\}\}/g, 'alex.smith@example.com')}
                          title="Live Preview"
                          className="w-full min-h-[420px] border-0"
                          sandbox="allow-same-origin"
                        />
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-2 text-center">
                        Simulating with placeholder contact: <span className="font-semibold">Alex Smith</span> (alex.smith@example.com)
                      </p>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </form>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
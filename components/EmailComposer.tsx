'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Quote,
  Link as LinkIcon,
  Code,
  Eye,
  Edit3,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Sparkles,
  MousePointerClick,
  Minus,
  Undo,
  Redo,
  Smartphone,
  Monitor
} from 'lucide-react'
import { Button } from '@/components/ui/button'

interface EmailComposerProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  minHeight?: string
}

const MERGE_TAGS = [
  { label: 'First Name', tag: '{{first_name}}' },
  { label: 'Last Name', tag: '{{last_name}}' },
  { label: 'Company', tag: '{{company_name}}' },
  { label: 'Job Title', tag: '{{title}}' },
  { label: 'Email Address', tag: '{{email}}' },
  { label: 'Unsubscribe Link', tag: '{{unsubscribe}}' },
]

export default function EmailComposer({
  value,
  onChange,
  placeholder = 'Write your email message here...',
  minHeight = '320px',
}: EmailComposerProps) {
  const [activeTab, setActiveTab] = useState<'visual' | 'code' | 'preview'>('visual')
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop')
  const editorRef = useRef<HTMLDivElement>(null)
  const isInternalUpdate = useRef(false)

  // Initialize and sync visual editor content
  useEffect(() => {
    if (editorRef.current && !isInternalUpdate.current) {
      if (editorRef.current.innerHTML !== value) {
        editorRef.current.innerHTML = value || ''
      }
    }
    isInternalUpdate.current = false
  }, [value, activeTab])

  const handleVisualInput = useCallback(() => {
    if (editorRef.current) {
      isInternalUpdate.current = true
      const html = editorRef.current.innerHTML
      onChange(html)
    }
  }, [onChange])

  // Execute formatting command
  const execCmd = (cmd: string, val: string | undefined = undefined) => {
    document.execCommand(cmd, false, val)
    if (editorRef.current) {
      editorRef.current.focus()
      handleVisualInput()
    }
  }

  // Insert merge tag or HTML snippet at current selection
  const insertSnippet = (snippet: string) => {
    if (activeTab === 'visual') {
      if (editorRef.current) {
        editorRef.current.focus()
        document.execCommand('insertText', false, snippet)
        handleVisualInput()
      }
    } else if (activeTab === 'code') {
      onChange(value + snippet)
    }
  }

  const insertLink = () => {
    const url = window.prompt('Enter URL:', 'https://')
    if (url) {
      execCmd('createLink', url)
    }
  }

  const insertButton = () => {
    const text = window.prompt('Button Text:', 'Click Here')
    if (!text) return
    const url = window.prompt('Button URL:', 'https://') || '#'
    const buttonHtml = `&nbsp;<a href="${url}" style="display:inline-block;padding:10px 20px;background-color:#2563eb;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:600;font-family:sans-serif;margin:8px 0;">${text}</a>&nbsp;`
    if (activeTab === 'visual' && editorRef.current) {
      editorRef.current.focus()
      document.execCommand('insertHTML', false, buttonHtml)
      handleVisualInput()
    } else {
      onChange(value + buttonHtml)
    }
  }

  // Generate clean preview with sample merge tag replacement
  const getSimulatedPreview = (rawHtml: string) => {
    let preview = rawHtml || '<p style="color:#888;">(Empty email body)</p>'
    preview = preview.replace(/\{\{\s*first_name\s*\}\}/gi, 'Alex')
    preview = preview.replace(/\{\{\s*last_name\s*\}\}/gi, 'Morgan')
    preview = preview.replace(/\{\{\s*company_name\s*\}\}/gi, 'Acme Corp')
    preview = preview.replace(/\{\{\s*title\s*\}\}/gi, 'Marketing Director')
    preview = preview.replace(/\{\{\s*email\s*\}\}/gi, 'alex.morgan@example.com')
    preview = preview.replace(/\{\{\s*unsubscribe\s*\}\}/gi, '#unsubscribe')
    return preview
  }

  return (
    <div className="border rounded-lg overflow-hidden bg-background shadow-sm">
      {/* Top Mode Tabs & Controls */}
      <div className="flex flex-wrap items-center justify-between border-b bg-muted/40 px-3 py-2 gap-2">
        <div className="flex items-center gap-1 bg-muted p-0.5 rounded-md border text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('visual')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded font-medium transition-colors ${
              activeTab === 'visual'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Edit3 className="h-3.5 w-3.5" />
            Visual Composer
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('code')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded font-medium transition-colors ${
              activeTab === 'code'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Code className="h-3.5 w-3.5" />
            HTML Source
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('preview')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded font-medium transition-colors ${
              activeTab === 'preview'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Eye className="h-3.5 w-3.5" />
            Live Preview
          </button>
        </div>

        {/* Quick Merge Tag Chips */}
        <div className="flex items-center flex-wrap gap-1.5 text-xs">
          <span className="text-muted-foreground flex items-center gap-1 font-medium mr-1">
            <Sparkles className="h-3.5 w-3.5 text-primary" /> Insert Tag:
          </span>
          {MERGE_TAGS.map((t) => (
            <button
              key={t.tag}
              type="button"
              onClick={() => insertSnippet(t.tag)}
              className="bg-primary/10 text-primary hover:bg-primary/20 transition-colors px-2 py-0.5 rounded font-mono text-[11px] font-medium"
              title={`Click to insert ${t.tag} at cursor`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Visual Formatting Toolbar (Only in Visual Mode) */}
      {activeTab === 'visual' && (
        <div className="flex flex-wrap items-center gap-1 px-3 py-2 border-b bg-muted/20 text-muted-foreground">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => execCmd('bold')}
            title="Bold (Ctrl+B)"
          >
            <Bold className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => execCmd('italic')}
            title="Italic (Ctrl+I)"
          >
            <Italic className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => execCmd('underline')}
            title="Underline (Ctrl+U)"
          >
            <Underline className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => execCmd('strikeThrough')}
            title="Strikethrough"
          >
            <Strikethrough className="h-4 w-4" />
          </Button>

          <div className="h-4 w-px bg-border mx-1" />

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => execCmd('formatBlock', '<h1>')}
            title="Heading 1"
          >
            <Heading1 className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => execCmd('formatBlock', '<h2>')}
            title="Heading 2"
          >
            <Heading2 className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs font-semibold"
            onClick={() => execCmd('formatBlock', '<p>')}
            title="Paragraph Text"
          >
            P
          </Button>

          <div className="h-4 w-px bg-border mx-1" />

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => execCmd('justifyLeft')}
            title="Align Left"
          >
            <AlignLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => execCmd('justifyCenter')}
            title="Align Center"
          >
            <AlignCenter className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => execCmd('justifyRight')}
            title="Align Right"
          >
            <AlignRight className="h-4 w-4" />
          </Button>

          <div className="h-4 w-px bg-border mx-1" />

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => execCmd('insertUnorderedList')}
            title="Bullet List"
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => execCmd('insertOrderedList')}
            title="Numbered List"
          >
            <ListOrdered className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => execCmd('formatBlock', '<blockquote>')}
            title="Quote Box"
          >
            <Quote className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => execCmd('insertHorizontalRule')}
            title="Divider Line"
          >
            <Minus className="h-4 w-4" />
          </Button>

          <div className="h-4 w-px bg-border mx-1" />

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs flex items-center gap-1"
            onClick={insertLink}
            title="Insert Link"
          >
            <LinkIcon className="h-3.5 w-3.5" />
            Link
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs flex items-center gap-1 text-primary font-medium"
            onClick={insertButton}
            title="Insert Call-to-Action Button"
          >
            <MousePointerClick className="h-3.5 w-3.5" />
            Add Button
          </Button>

          <div className="h-4 w-px bg-border mx-1 ml-auto" />

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => execCmd('undo')}
            title="Undo (Ctrl+Z)"
          >
            <Undo className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => execCmd('redo')}
            title="Redo (Ctrl+Y)"
          >
            <Redo className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Editor Body */}
      <div className="p-4">
        {activeTab === 'visual' && (
          <div
            ref={editorRef}
            contentEditable
            onInput={handleVisualInput}
            style={{ minHeight }}
            className="outline-none focus:outline-none prose prose-sm max-w-none font-sans text-foreground leading-relaxed email-content-editable"
            data-placeholder={placeholder}
          />
        )}

        {activeTab === 'code' && (
          <div className="relative">
            <textarea
              value={value}
              onChange={(e) => onChange(e.target.value)}
              style={{ minHeight }}
              className="w-full font-mono text-xs p-3 rounded bg-zinc-950 text-zinc-100 border focus:outline-none focus:ring-1 focus:ring-primary leading-relaxed resize-y"
              placeholder="Paste or write HTML code here..."
            />
            <div className="text-[11px] text-muted-foreground mt-1.5 flex items-center justify-between">
              <span>Standard HTML markup is fully supported.</span>
              <button
                type="button"
                onClick={() => setActiveTab('visual')}
                className="text-primary hover:underline font-medium"
              >
                Switch back to Visual Composer →
              </button>
            </div>
          </div>
        )}

        {activeTab === 'preview' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b">
              <span className="text-xs text-muted-foreground">
                Showing simulated preview with sample contact data (Alex Morgan, Acme Corp)
              </span>
              <div className="flex items-center gap-1 bg-muted p-0.5 rounded text-xs">
                <button
                  type="button"
                  onClick={() => setPreviewDevice('desktop')}
                  className={`px-2 py-1 rounded flex items-center gap-1 ${
                    previewDevice === 'desktop' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'
                  }`}
                >
                  <Monitor className="h-3 w-3" /> Desktop
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDevice('mobile')}
                  className={`px-2 py-1 rounded flex items-center gap-1 ${
                    previewDevice === 'mobile' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'
                  }`}
                >
                  <Smartphone className="h-3 w-3" /> Mobile
                </button>
              </div>
            </div>

            <div
              className={`mx-auto transition-all bg-white text-zinc-900 border rounded-lg p-6 shadow-sm ${
                previewDevice === 'mobile' ? 'max-w-[375px]' : 'max-w-2xl'
              }`}
              style={{ minHeight }}
            >
              <div
                dangerouslySetInnerHTML={{
                  __html: getSimulatedPreview(value),
                }}
                className="prose prose-sm max-w-none"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
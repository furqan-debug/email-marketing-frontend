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
  AlignJustify,
  Sparkles,
  MousePointerClick,
  Minus,
  Undo,
  Redo,
  Smartphone,
  Monitor,
  RemoveFormatting,
  Image as ImageIcon,
  Smile,
  Indent,
  Outdent,
  ChevronDown
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

const FONTS = [
  { label: 'Default (Sans Serif)', value: 'Arial, Helvetica, sans-serif' },
  { label: 'Serif (Georgia)', value: 'Georgia, serif' },
  { label: 'Times New Roman', value: '"Times New Roman", Times, serif' },
  { label: 'Verdana', value: 'Verdana, Geneva, sans-serif' },
  { label: 'Tahoma', value: 'Tahoma, Geneva, sans-serif' },
  { label: 'Trebuchet MS', value: '"Trebuchet MS", sans-serif' },
  { label: 'Monospace (Code)', value: '"Courier New", Courier, monospace' },
]

const FONT_SIZES = [
  { label: 'Small (12px)', value: '2' },
  { label: 'Normal (14px)', value: '3' },
  { label: 'Large (18px)', value: '5' },
  { label: 'Huge (24px)', value: '6' },
]

const TEXT_COLORS = [
  '#000000', '#475569', '#94a3b8', '#ffffff',
  '#dc2626', '#ea580c', '#d97706', '#16a34a',
  '#0284c7', '#2563eb', '#7c3aed', '#db2777'
]

const BG_HIGHLIGHTS = [
  'transparent', '#fee2e2', '#ffedd5', '#fef3c7',
  '#dcfce7', '#e0f2fe', '#dbeafe', '#f3e8ff'
]

const EMOJIS = [
  '😀', '😃', '😄', '😁', '😊', '😍', '🥰', '😘', '😋', '🎉', 
  '🚀', '🔥', '✨', '💡', '📢', '📧', '✉️', '📦', '🎁', '🏆', 
  '👍', '👏', '🙌', '🤝', '👋', '⭐', '💯', '🎯', '💼', '📈'
]

export default function EmailComposer({
  value,
  onChange,
  placeholder = 'Write your email message here...',
  minHeight = '320px',
}: EmailComposerProps) {
  const [activeTab, setActiveTab] = useState<'visual' | 'code' | 'preview'>('visual')
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop')
  const [lineSpacing, setLineSpacing] = useState<'normal' | 'compact' | 'relaxed'>('normal')
  
  // Popovers state
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [customTextColor, setCustomTextColor] = useState('#2563eb')
  const [customBgColor, setCustomBgColor] = useState('#fef08a')
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [showImageModal, setShowImageModal] = useState(false)
  const [imageUrl, setImageUrl] = useState('')

  const editorRef = useRef<HTMLDivElement>(null)
  const isInternalUpdate = useRef(false)
  const savedRangeRef = useRef<Range | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Save current selection whenever user types or clicks inside the editor
  const saveSelection = () => {
    const sel = window.getSelection()
    if (sel && sel.rangeCount > 0 && editorRef.current?.contains(sel.anchorNode)) {
      savedRangeRef.current = sel.getRangeAt(0)
    }
  }

  // Restore saved selection
  const restoreSelection = () => {
    if (savedRangeRef.current) {
      const sel = window.getSelection()
      if (sel) {
        sel.removeAllRanges()
        sel.addRange(savedRangeRef.current)
      }
    } else if (editorRef.current) {
      editorRef.current.focus()
    }
  }

  // Sync external value changes into contentEditable (only when not typing internally)
  useEffect(() => {
    if (editorRef.current && !isInternalUpdate.current) {
      if (editorRef.current.innerHTML !== (value || '')) {
        editorRef.current.innerHTML = value || ''
      }
      // Auto-detect saved line spacing from the HTML content
      if (value) {
        if (
          value.includes('line-height: 1.25') || 
          value.includes('line-height: 1.3') || 
          value.includes('margin-bottom: 4px') ||
          value.includes('spacing-compact')
        ) {
          setLineSpacing('compact')
        } else if (
          value.includes('line-height: 2') || 
          value.includes('margin-bottom: 18px') || 
          value.includes('margin-bottom: 20px') ||
          value.includes('spacing-relaxed')
        ) {
          setLineSpacing('relaxed')
        } else {
          setLineSpacing('normal')
        }
      }
    }
    isInternalUpdate.current = false
  }, [value, activeTab])

  const handleVisualInput = useCallback(() => {
    if (editorRef.current) {
      isInternalUpdate.current = true
      const html = editorRef.current.innerHTML
      onChange(html === '<p><br></p>' || html === '<br>' ? '' : html)
      saveSelection()
    }
  }, [onChange])

  // Apply line & paragraph spacing permanently into the HTML
  const applyLineSpacing = (spacing: 'compact' | 'normal' | 'relaxed') => {
    setLineSpacing(spacing)
    if (!editorRef.current) return

    const lineHeight = spacing === 'compact' ? '1.25' : spacing === 'relaxed' ? '2.0' : '1.6'
    const pMargin = spacing === 'compact' ? '4px' : spacing === 'relaxed' ? '18px' : '10px'

    const blocks = editorRef.current.querySelectorAll('p, div, li, blockquote, h1, h2, h3')
    if (blocks.length > 0) {
      blocks.forEach((el) => {
        const htmlEl = el as HTMLElement
        htmlEl.style.lineHeight = lineHeight
        if (htmlEl.tagName === 'P') {
          htmlEl.style.marginBottom = pMargin
        }
      })
    } else {
      editorRef.current.style.lineHeight = lineHeight
    }

    handleVisualInput()
  }

  // Execute formatting command without losing selection focus
  const execCmd = (cmd: string, val: string | undefined = undefined) => {
    if (editorRef.current) {
      editorRef.current.focus()
      restoreSelection()
      
      try {
        if (cmd === 'formatBlock' && val) {
          // Cross-browser formatBlock support
          const success = document.execCommand('formatBlock', false, val)
          if (!success) {
            document.execCommand('formatBlock', false, val.replace(/[<>]/g, ''))
          }
        } else if (cmd === 'insertUnorderedList' || cmd === 'insertOrderedList') {
          // Ensure editor is ready for list command
          if (!editorRef.current.innerHTML || editorRef.current.innerHTML === '<br>') {
            editorRef.current.innerHTML = '<p></p>'
          }
          document.execCommand(cmd, false, val)
        } else {
          document.execCommand(cmd, false, val)
        }
      } catch (err) {
        console.warn('execCommand failed:', cmd, err)
      }

      handleVisualInput()
      saveSelection()
    }
  }

  // Insert merge tag or text at current selection
  const insertSnippet = (snippet: string) => {
    if (activeTab === 'visual') {
      if (editorRef.current) {
        editorRef.current.focus()
        restoreSelection()
        document.execCommand('insertText', false, snippet)
        handleVisualInput()
        saveSelection()
      }
    } else if (activeTab === 'code') {
      onChange(value + snippet)
    }
  }
  const insertText = insertSnippet


  // Insert raw HTML
  const insertHtml = (htmlSnippet: string) => {
    if (activeTab === 'visual') {
      if (editorRef.current) {
        editorRef.current.focus()
        restoreSelection()
        document.execCommand('insertHTML', false, htmlSnippet)
        handleVisualInput()
        saveSelection()
      }
    } else {
      onChange(value + htmlSnippet)
    }
  }

  const insertLink = () => {
    saveSelection()
    const url = window.prompt('Enter Link URL (e.g. https://digireps.org):', 'https://')
    if (url && url.trim()) {
      execCmd('createLink', url.trim())
    }
  }

  const insertButton = () => {
    saveSelection()
    const text = window.prompt('Button Text:', 'Explore Now')
    if (!text) return
    const url = window.prompt('Button Target URL:', 'https://') || '#'
    const buttonHtml = `&nbsp;<a href="${url}" style="display:inline-block;padding:12px 24px;background-color:#2563eb;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:600;font-family:sans-serif;margin:12px 0;">${text}</a>&nbsp;`
    insertHtml(buttonHtml)
  }

  // Handle Image URL insertion
  const handleInsertImageUrl = () => {
    if (!imageUrl.trim()) return
    const imgHtml = `<p><img src="${imageUrl.trim()}" alt="Image" style="max-width:100%;height:auto;border-radius:6px;margin:8px 0;" /></p>`
    insertHtml(imgHtml)
    setImageUrl('')
    setShowImageModal(false)
  }

  // Handle local image file upload (Base64 data URL)
  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (loadEvent) => {
      const base64 = loadEvent.target?.result as string
      if (base64) {
        const imgHtml = `<p><img src="${base64}" alt="${file.name}" style="max-width:100%;height:auto;border-radius:6px;margin:8px 0;" /></p>`
        insertHtml(imgHtml)
        setShowImageModal(false)
      }
    }
    reader.readAsDataURL(file)
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

  // Close floating popovers on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('.color-picker-popover') && !target.closest('.color-picker-btn')) {
        setShowColorPicker(false)
      }
      if (!target.closest('.emoji-picker-popover') && !target.closest('.emoji-picker-btn')) {
        setShowEmojiPicker(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="border rounded-lg overflow-hidden bg-background shadow-sm">
      {/* ── Top Bar: Mode Tabs & Merge Tags ── */}
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
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => insertSnippet(t.tag)}
              className="bg-primary/10 text-primary hover:bg-primary/20 transition-colors px-2 py-0.5 rounded font-mono text-[11px] font-medium"
              title={`Click to insert ${t.tag} at cursor`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Main Formatting Toolbar (Gmail-Style Rich Controls) ── */}
      {activeTab === 'visual' && (
        <div 
          className="flex flex-wrap items-center gap-1 px-3 py-2 border-b bg-muted/20 text-muted-foreground select-none relative"
          onMouseDown={(e) => {
            if ((e.target as HTMLElement).tagName !== 'SELECT') {
              e.preventDefault()
            }
          }}
        >
          {/* 1. Font Family Selector */}
          <div className="flex items-center">
            <select
              className="h-7 text-xs bg-background border rounded px-1.5 py-0 text-foreground font-medium outline-none focus:ring-1 focus:ring-primary cursor-pointer"
              onChange={(e) => {
                execCmd('fontName', e.target.value)
              }}
              title="Font Family"
              defaultValue="Arial, Helvetica, sans-serif"
            >
              {FONTS.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>

          {/* 2. Font Size Selector */}
          <div className="flex items-center">
            <select
              className="h-7 text-xs bg-background border rounded px-1.5 py-0 text-foreground font-medium outline-none focus:ring-1 focus:ring-primary cursor-pointer"
              onChange={(e) => {
                execCmd('fontSize', e.target.value)
              }}
              title="Font Size"
              defaultValue="3"
            >
              {FONT_SIZES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          <div className="h-4 w-px bg-border mx-1" />

          {/* 3. Basic Styles (B, I, U, S) */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 hover:text-foreground hover:bg-muted font-bold"
            onClick={() => execCmd('bold')}
            title="Bold (Ctrl+B)"
          >
            <Bold className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 hover:text-foreground hover:bg-muted"
            onClick={() => execCmd('italic')}
            title="Italic (Ctrl+I)"
          >
            <Italic className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 hover:text-foreground hover:bg-muted"
            onClick={() => execCmd('underline')}
            title="Underline (Ctrl+U)"
          >
            <Underline className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 hover:text-foreground hover:bg-muted"
            onClick={() => execCmd('strikeThrough')}
            title="Strikethrough"
          >
            <Strikethrough className="h-4 w-4" />
          </Button>

          {/* 4. Text & Background Color Picker Dropdown */}
          <div className="relative">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-1.5 text-xs flex items-center gap-1 hover:text-foreground hover:bg-muted color-picker-btn font-bold"
              onClick={() => {
                saveSelection()
                setShowColorPicker(!showColorPicker)
                setShowEmojiPicker(false)
              }}
              title="Text & Highlight Color"
            >
              <span className="underline decoration-primary decoration-2">A</span>
              <ChevronDown className="h-3 w-3 opacity-60" />
            </Button>

            {showColorPicker && (
              <div 
                className="absolute top-8 left-0 z-50 bg-popover text-popover-foreground border rounded-lg shadow-xl p-3.5 w-64 space-y-3.5 color-picker-popover"
                onMouseDown={(e) => e.stopPropagation()}
              >
                {/* Text Color Section */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-semibold text-muted-foreground">Text Color</span>
                    <span className="text-[10px] text-muted-foreground font-mono">{customTextColor}</span>
                  </div>
                  <div className="grid grid-cols-6 gap-1.5 mb-2">
                    {TEXT_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        style={{ backgroundColor: c }}
                        className="h-5 w-5 rounded-md border border-black/20 hover:scale-110 transition-transform shadow-xs"
                        onClick={() => {
                          setCustomTextColor(c)
                          execCmd('foreColor', c)
                        }}
                        title={c}
                      />
                    ))}
                  </div>

                  {/* Custom Hex / Color Wheel for Text */}
                  <div className="flex items-center gap-1.5 pt-1">
                    <input
                      type="color"
                      value={customTextColor.startsWith('#') && customTextColor.length === 7 ? customTextColor : '#000000'}
                      onChange={(e) => {
                        setCustomTextColor(e.target.value)
                        execCmd('foreColor', e.target.value)
                      }}
                      className="h-6 w-6 p-0 border rounded cursor-pointer shrink-0 bg-transparent"
                      title="Click for full color spectrum wheel"
                    />
                    <input
                      type="text"
                      value={customTextColor}
                      onChange={(e) => setCustomTextColor(e.target.value)}
                      placeholder="#hex"
                      className="h-6 flex-1 text-[11px] font-mono border rounded px-1.5 bg-background text-foreground"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="h-6 px-2 text-[10px]"
                      onClick={() => {
                        if (customTextColor) execCmd('foreColor', customTextColor)
                      }}
                    >
                      Apply
                    </Button>
                  </div>
                </div>

                {/* Highlight Background Section */}
                <div className="pt-2 border-t">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-semibold text-muted-foreground">Highlight Background</span>
                    <span className="text-[10px] text-muted-foreground font-mono">{customBgColor}</span>
                  </div>
                  <div className="grid grid-cols-6 gap-1.5 mb-2">
                    {BG_HIGHLIGHTS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        style={{ backgroundColor: c === 'transparent' ? '#ffffff' : c }}
                        className="h-5 w-5 rounded-md border border-black/20 flex items-center justify-center text-[9px] hover:scale-110 transition-transform shadow-xs"
                        onClick={() => {
                          setCustomBgColor(c)
                          execCmd('hiliteColor', c)
                        }}
                        title={c === 'transparent' ? 'No highlight' : c}
                      >
                        {c === 'transparent' ? '✕' : ''}
                      </button>
                    ))}
                  </div>

                  {/* Custom Hex / Color Wheel for Background */}
                  <div className="flex items-center gap-1.5 pt-1">
                    <input
                      type="color"
                      value={customBgColor.startsWith('#') && customBgColor.length === 7 ? customBgColor : '#fef08a'}
                      onChange={(e) => {
                        setCustomBgColor(e.target.value)
                        execCmd('hiliteColor', e.target.value)
                      }}
                      className="h-6 w-6 p-0 border rounded cursor-pointer shrink-0 bg-transparent"
                      title="Click for full color spectrum wheel"
                    />
                    <input
                      type="text"
                      value={customBgColor}
                      onChange={(e) => setCustomBgColor(e.target.value)}
                      placeholder="#hex"
                      className="h-6 flex-1 text-[11px] font-mono border rounded px-1.5 bg-background text-foreground"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="h-6 px-2 text-[10px]"
                      onClick={() => {
                        if (customBgColor) execCmd('hiliteColor', customBgColor)
                      }}
                    >
                      Apply
                    </Button>
                  </div>
                </div>
              </div>
            )}

          </div>

          <div className="h-4 w-px bg-border mx-1" />

          {/* 5. Headings (H1, H2, P) */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-1.5 text-xs font-bold hover:text-foreground hover:bg-muted"
            onClick={() => execCmd('formatBlock', '<h1>')}
            title="Heading 1"
          >
            H1
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-1.5 text-xs font-bold hover:text-foreground hover:bg-muted"
            onClick={() => execCmd('formatBlock', '<h2>')}
            title="Heading 2"
          >
            H2
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-1.5 text-xs font-semibold hover:text-foreground hover:bg-muted"
            onClick={() => execCmd('formatBlock', '<p>')}
            title="Paragraph"
          >
            P
          </Button>

          <div className="h-4 w-px bg-border mx-1" />

          {/* 6. Alignment */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 hover:text-foreground hover:bg-muted"
            onClick={() => execCmd('justifyLeft')}
            title="Align Left"
          >
            <AlignLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 hover:text-foreground hover:bg-muted"
            onClick={() => execCmd('justifyCenter')}
            title="Align Center"
          >
            <AlignCenter className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 hover:text-foreground hover:bg-muted"
            onClick={() => execCmd('justifyRight')}
            title="Align Right"
          >
            <AlignRight className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 hover:text-foreground hover:bg-muted"
            onClick={() => execCmd('justifyFull')}
            title="Justify"
          >
            <AlignJustify className="h-4 w-4" />
          </Button>

          <div className="h-4 w-px bg-border mx-1" />

          {/* 7. Lists & Indents */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 hover:text-foreground hover:bg-muted"
            onClick={() => execCmd('insertUnorderedList')}
            title="Bullet Points"
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 hover:text-foreground hover:bg-muted"
            onClick={() => execCmd('insertOrderedList')}
            title="Numbered List"
          >
            <ListOrdered className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 hover:text-foreground hover:bg-muted"
            onClick={() => execCmd('outdent')}
            title="Indent Less"
          >
            <Outdent className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 hover:text-foreground hover:bg-muted"
            onClick={() => execCmd('indent')}
            title="Indent More"
          >
            <Indent className="h-4 w-4" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 hover:text-foreground hover:bg-muted"
            onClick={() => execCmd('formatBlock', '<blockquote>')}
            title="Quote Box"
          >
            <Quote className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 hover:text-foreground hover:bg-muted"
            onClick={() => execCmd('insertHorizontalRule')}
            title="Divider Line"
          >
            <Minus className="h-4 w-4" />
          </Button>

          <div className="h-4 w-px bg-border mx-1" />

          {/* 8. Line Spacing Toggle */}
          <div className="flex items-center">
            <select
              className="h-7 text-xs bg-background border rounded px-1 text-foreground font-medium outline-none focus:ring-1 focus:ring-primary cursor-pointer"
              value={lineSpacing}
              onChange={(e) => applyLineSpacing(e.target.value as any)}
              title="Line & Paragraph Spacing"
            >
              <option value="compact">Tight Spacing</option>
              <option value="normal">Normal Spacing</option>
              <option value="relaxed">Relaxed Spacing</option>
            </select>
          </div>

          <div className="h-4 w-px bg-border mx-1" />

          {/* 9. Attach Image */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs flex items-center gap-1 hover:text-foreground hover:bg-muted"
            onClick={() => {
              saveSelection()
              setShowImageModal(true)
            }}
            title="Insert Image"
          >
            <ImageIcon className="h-3.5 w-3.5" />
            Image
          </Button>

          {/* 10. Emoji Picker Popover */}
          <div className="relative">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs flex items-center gap-1 hover:text-foreground hover:bg-muted emoji-picker-btn"
              onClick={() => {
                saveSelection()
                setShowEmojiPicker(!showEmojiPicker)
                setShowColorPicker(false)
              }}
              title="Insert Emoji"
            >
              <Smile className="h-3.5 w-3.5 text-amber-500" />
              Emoji
            </Button>

            {showEmojiPicker && (
              <div 
                className="absolute top-8 left-0 z-50 bg-popover text-popover-foreground border rounded-lg shadow-xl p-3 w-64 emoji-picker-popover"
                onMouseDown={(e) => e.stopPropagation()}
              >
                <p className="text-[11px] font-semibold text-muted-foreground mb-2">Click emoji to insert:</p>
                <div className="grid grid-cols-6 gap-1.5 text-lg">
                  {EMOJIS.map((em) => (
                    <button
                      key={em}
                      type="button"
                      className="h-8 w-8 rounded hover:bg-muted flex items-center justify-center hover:scale-125 transition-transform"
                      onClick={() => {
                        insertText(em)
                        setShowEmojiPicker(false)
                      }}
                    >
                      {em}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 11. Links & Buttons */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs flex items-center gap-1 hover:text-foreground hover:bg-muted"
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
            className="h-7 px-2 text-xs flex items-center gap-1 text-primary font-medium hover:bg-primary/10"
            onClick={insertButton}
            title="Insert Call-to-Action Button"
          >
            <MousePointerClick className="h-3.5 w-3.5" />
            Add Button
          </Button>

          {/* 12. Clear Formatting */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 hover:text-foreground hover:bg-muted"
            onClick={() => execCmd('removeFormat')}
            title="Clear Formatting"
          >
            <RemoveFormatting className="h-3.5 w-3.5" />
          </Button>

          <div className="h-4 w-px bg-border mx-1 ml-auto" />

          {/* 13. Undo / Redo */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 hover:text-foreground hover:bg-muted"
            onClick={() => execCmd('undo')}
            title="Undo (Ctrl+Z)"
          >
            <Undo className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 hover:text-foreground hover:bg-muted"
            onClick={() => execCmd('redo')}
            title="Redo (Ctrl+Y)"
          >
            <Redo className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* ── Editor Body ── */}
      <div className="p-4">
        {activeTab === 'visual' && (
          <div
            ref={editorRef}
            contentEditable
            onInput={handleVisualInput}
            onKeyUp={saveSelection}
            onMouseUp={saveSelection}
            onFocus={saveSelection}
            style={{ minHeight }}
            className={`outline-none focus:outline-none max-w-none text-foreground email-content-editable ${
              lineSpacing === 'compact' 
                ? 'spacing-compact' 
                : lineSpacing === 'relaxed' 
                ? 'spacing-relaxed' 
                : 'spacing-normal'
            }`}
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
                className={`email-content-editable ${
                  lineSpacing === 'compact' 
                    ? 'spacing-compact' 
                    : lineSpacing === 'relaxed' 
                    ? 'spacing-relaxed' 
                    : 'spacing-normal'
                }`}
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Image Insert Modal ── */}
      {showImageModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-background border rounded-lg shadow-2xl p-6 w-full max-w-md space-y-4">
            <div className="flex items-center justify-between pb-2 border-b">
              <h3 className="font-semibold text-base flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-primary" />
                Insert Image
              </h3>
              <button 
                onClick={() => setShowImageModal(false)}
                className="text-muted-foreground hover:text-foreground text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-sm">
              {/* Option A: Upload file */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                  1. Upload from Computer:
                </label>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleImageFileUpload}
                  className="w-full text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-primary-foreground hover:file:opacity-90 cursor-pointer"
                />
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground my-1">
                <div className="h-px bg-border flex-1" />
                <span>OR</span>
                <div className="h-px bg-border flex-1" />
              </div>

              {/* Option B: Image URL */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                  2. Image Web URL:
                </label>
                <input
                  type="url"
                  placeholder="https://example.com/logo.png"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full border rounded px-3 py-2 text-xs bg-background focus:ring-1 focus:ring-primary outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowImageModal(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleInsertImageUrl}
                disabled={!imageUrl.trim()}
              >
                Insert Image URL
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
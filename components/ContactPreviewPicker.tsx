'use client'

import React, { useState, useRef, useEffect, useMemo } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  User,
  Search,
  Check,
  Hash
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Contact } from '@/lib/types'

interface ContactPreviewPickerProps {
  contacts: Contact[]
  selectedIndex: number
  onSelectIndex: (index: number) => void
  className?: string
}

export default function ContactPreviewPicker({
  contacts = [],
  selectedIndex = 0,
  onSelectIndex,
  className = '',
}: ContactPreviewPickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [jumpRow, setJumpRow] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Safe active contact
  const activeContact = contacts[selectedIndex] || contacts[0]
  const total = contacts.length

  // Filter contacts by search query
  const filteredContacts = useMemo(() => {
    if (!search.trim()) return contacts.slice(0, 100).map((c, i) => ({ ...c, originalIndex: i }))
    const q = search.toLowerCase()
    const results: Array<Contact & { originalIndex: number }> = []
    for (let i = 0; i < contacts.length; i++) {
      const c = contacts[i]
      const name = `${c.firstName || ''} ${c.lastName || ''}`.toLowerCase()
      const email = (c.email || '').toLowerCase()
      if (name.includes(q) || email.includes(q) || String(i + 1) === q.replace('#', '')) {
        results.push({ ...c, originalIndex: i })
        if (results.length >= 100) break
      }
    }
    return results
  }, [contacts, search])

  // Close popover when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      setTimeout(() => searchInputRef.current?.focus(), 50)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  if (!contacts || contacts.length === 0) return null

  const displayName = [activeContact?.firstName, activeContact?.lastName].filter(Boolean).join(' ') || 'Recipient'

  const handleJump = (e: React.FormEvent) => {
    e.preventDefault()
    const rowNum = parseInt(jumpRow, 10)
    if (!isNaN(rowNum) && rowNum >= 1 && rowNum <= total) {
      onSelectIndex(rowNum - 1)
      setIsOpen(false)
      setJumpRow('')
    }
  }

  return (
    <div ref={containerRef} className={`relative inline-flex items-center gap-1.5 ${className}`}>
      {/* Pager Previous Button */}
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-7 w-7 rounded-md shrink-0 hover:bg-muted"
        disabled={selectedIndex <= 0}
        onClick={() => onSelectIndex(Math.max(0, selectedIndex - 1))}
        title="Previous Contact"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
      </Button>

      {/* Main Searchable Trigger Badge */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="h-7 px-2.5 bg-background hover:bg-muted/50 border rounded-md text-xs flex items-center gap-2 font-medium text-foreground transition-colors shadow-2xs max-w-[280px] sm:max-w-[340px]"
        title="Click to search or jump to another recipient"
      >
        <User className="h-3.5 w-3.5 text-primary shrink-0" />
        <span className="truncate">
          <strong className="text-primary font-semibold">#{selectedIndex + 1}</strong>{' '}
          {displayName} <span className="text-muted-foreground text-[11px]">({activeContact?.email})</span>
        </span>
        <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground ml-auto shrink-0 font-mono">
          of {total}
        </span>
        <ChevronDown className={`h-3 w-3 text-muted-foreground shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Pager Next Button */}
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-7 w-7 rounded-md shrink-0 hover:bg-muted"
        disabled={selectedIndex >= total - 1}
        onClick={() => onSelectIndex(Math.min(total - 1, selectedIndex + 1))}
        title="Next Contact"
      >
        <ChevronRight className="h-3.5 w-3.5" />
      </Button>

      {/* Searchable Dropdown Popover */}
      {isOpen && (
        <div className="absolute top-9 left-0 z-50 w-80 sm:w-96 bg-popover text-popover-foreground border rounded-xl shadow-xl overflow-hidden animate-in fade-in-50 zoom-in-95">
          {/* Popover Header with Search & Jump to Row */}
          <div className="p-2.5 border-b bg-muted/30 space-y-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, email, or row #..."
                className="w-full h-8 pl-8 pr-3 text-xs bg-background border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <form onSubmit={handleJump} className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <Hash className="h-3 w-3" /> Jump to Row (1–{total}):
              </span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={1}
                  max={total}
                  value={jumpRow}
                  onChange={(e) => setJumpRow(e.target.value)}
                  placeholder="#"
                  className="w-16 h-6 text-xs bg-background border rounded px-1.5 font-mono text-center focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <Button type="submit" size="sm" variant="secondary" className="h-6 px-2 text-[10px] font-semibold">
                  Go
                </Button>
              </div>
            </form>
          </div>

          {/* Scrollable Results List */}
          <div className="max-h-60 overflow-y-auto p-1 divide-y divide-border/50 text-xs">
            {filteredContacts.length === 0 ? (
              <div className="p-4 text-center text-xs text-muted-foreground">
                No matching contacts found.
              </div>
            ) : (
              filteredContacts.map((c) => {
                const isSelected = c.originalIndex === selectedIndex
                const cName = [c.firstName, c.lastName].filter(Boolean).join(' ') || 'Recipient'
                return (
                  <button
                    key={c.id || c.originalIndex}
                    type="button"
                    onClick={() => {
                      onSelectIndex(c.originalIndex)
                      setIsOpen(false)
                      setSearch('')
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between transition-colors ${
                      isSelected ? 'bg-primary/10 text-primary font-semibold' : 'hover:bg-muted/70 text-foreground'
                    }`}
                  >
                    <div className="truncate pr-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-mono text-muted-foreground">#{c.originalIndex + 1}</span>
                        <span className="truncate">{cName}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate font-mono mt-0.5">{c.email}</p>
                    </div>
                    {isSelected && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                  </button>
                )
              })
            )}
          </div>

          {/* Footer Total */}
          <div className="p-2 border-t bg-muted/20 text-[10px] text-muted-foreground flex items-center justify-between">
            <span>Showing {filteredContacts.length} of {total} contacts</span>
            <span>Esc to close</span>
          </div>
        </div>
      )}
    </div>
  )
}

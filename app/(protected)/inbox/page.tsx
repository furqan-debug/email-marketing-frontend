'use client'

import { useEffect, useState, useCallback, useRef } from "react"
import Link from "next/link"
import { 
  Inbox, 
  RefreshCw, 
  Send, 
  Mail, 
  Search, 
  Archive, 
  ArchiveRestore,
  Clock, 
  User, 
  ExternalLink,
  AlertCircle,
  MessageSquareReply,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Eye,
  EyeOff,
  CornerDownLeft
} from "lucide-react"
import { 
  getInboxThreads, 
  getInboxThread, 
  markInboxRead, 
  markInboxUnread,
  archiveInboxThread, 
  unarchiveInboxThread,
  sendInboxReply, 
  getInboxStats, 
  syncImapInboxes 
} from "@/lib/api"

import { cleanEmailBody } from "@/lib/email-cleaner"
import type { InboxThread, InboxStats, InboxMessage } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"

function getAvatarColor(str: string) {
  const colors = [
    "bg-blue-500", "bg-purple-500", "bg-emerald-500", 
    "bg-amber-500", "bg-rose-500", "bg-indigo-500", "bg-cyan-500"
  ]
  let hash = 0
  for (let i = 0; i < (str || '').length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

function getInitials(nameOrEmail: string) {
  if (!nameOrEmail) return "?"
  const parts = nameOrEmail.trim().split(/\s+/)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return nameOrEmail.slice(0, 2).toUpperCase()
}

export default function InboxPage() {
  const [threads, setThreads] = useState<InboxThread[]>([])
  const [selectedThread, setSelectedThread] = useState<any | null>(null)
  const [stats, setStats] = useState<InboxStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [threadLoading, setThreadLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<string | null>(null)
  
  // Filters & Search
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState<string>("")
  
  // Toggles
  const [showOriginalCampaign, setShowOriginalCampaign] = useState<boolean>(false)
  const [expandedQuotes, setExpandedQuotes] = useState<Record<string, boolean>>({})

  // Reply composition
  const [replyBody, setReplyBody] = useState<string>("")
  const [sendingReply, setSendingReply] = useState<boolean>(false)
  const [sendSuccess, setSendSuccess] = useState<string | null>(null)
  const [sendError, setSendError] = useState<string | null>(null)

  const messagesEndRef = useRef<HTMLDivElement | null>(null)

  const loadInbox = useCallback(async (status?: string, preserveSelection = false) => {
    try {
      setLoading(true)
      const currentFilter = status !== undefined ? status : statusFilter
      const [threadsRes, statsRes] = await Promise.all([
        getInboxThreads(1, 50, currentFilter === "all" ? undefined : currentFilter),
        getInboxStats(),
      ])
      
      const loadedThreads = threadsRes.data || []
      setThreads(loadedThreads)
      setStats(statsRes)

      if (preserveSelection && selectedThread) {
        const found = loadedThreads.find(t => t.id === selectedThread.id)
        if (found) {
          const detailed = await getInboxThread(found.id)
          setSelectedThread(detailed)
        }
      } else if (!preserveSelection && loadedThreads.length > 0 && !selectedThread) {
        const firstId = loadedThreads[0].id
        const detailed = await getInboxThread(firstId)
        setSelectedThread(detailed)
      }
    } catch (err: any) {
      console.error("Failed to load inbox:", err)
    } finally {
      setLoading(false)
    }
  }, [statusFilter, selectedThread])

  useEffect(() => {
    loadInbox(statusFilter)
  }, [statusFilter])

  const handleSelectThread = async (thread: InboxThread) => {
    try {
      setThreadLoading(true)
      setSendSuccess(null)
      setSendError(null)
      setReplyBody("")
      setShowOriginalCampaign(false)
      
      const detailed = await getInboxThread(thread.id)
      setSelectedThread(detailed)

      if (detailed.status === "unread") {
        await markInboxRead(detailed.id)
        detailed.status = "read"
        setSelectedThread({ ...detailed })
        setThreads(prev => prev.map(t => t.id === detailed.id ? { ...t, status: "read" } : t))
        setStats(prev => prev ? { ...prev, unread: Math.max(0, prev.unread - 1) } : null)
      }
    } catch (err: any) {
      console.error("Failed to load thread details:", err)
    } finally {
      setThreadLoading(false)
    }
  }

  const handleSyncMailbox = async () => {
    try {
      setSyncing(true)
      setSyncResult(null)
      const res = await syncImapInboxes()
      if (res.matchedReplies !== undefined) {
        setSyncResult(`Mailbox synced. Scanned ${res.totalEmailsScanned} email(s) across ${res.syncedInboxes} account(s). Logged ${res.matchedReplies} reply(ies).`)
      } else {
        setSyncResult(res.message || "Sync completed successfully.")
      }
      await loadInbox(statusFilter, true)
    } catch (err: any) {
      setSyncResult("Sync error: " + (err.message || "Check your IMAP variables."))
    } finally {
      setSyncing(false)
    }
  }

  const handleArchiveThread = async (id: string) => {
    try {
      await archiveInboxThread(id)
      if (statusFilter !== "all" && statusFilter !== "archived") {
        setThreads(prev => prev.filter(t => t.id !== id))
        if (selectedThread?.id === id) {
          setSelectedThread(null)
        }
      } else {
        setThreads(prev => prev.map(t => t.id === id ? { ...t, status: "archived" } : t))
        if (selectedThread?.id === id) {
          setSelectedThread((prev: any) => prev ? { ...prev, status: "archived" } : null)
        }
      }
      setStats(prev => prev ? { ...prev, archived: prev.archived + 1 } : null)
    } catch (err: any) {
      alert("Failed to archive thread: " + err.message)
    }
  }

  const handleUnarchiveThread = async (id: string) => {
    try {
      await unarchiveInboxThread(id)
      if (statusFilter === "archived") {
        setThreads(prev => prev.filter(t => t.id !== id))
        if (selectedThread?.id === id) {
          setSelectedThread(null)
        }
      } else {
        setThreads(prev => prev.map(t => t.id === id ? { ...t, status: "read" } : t))
        if (selectedThread?.id === id) {
          setSelectedThread((prev: any) => prev ? { ...prev, status: "read" } : null)
        }
      }
      setStats(prev => prev ? { ...prev, archived: Math.max(0, prev.archived - 1) } : null)
    } catch (err: any) {
      alert("Failed to unarchive thread: " + err.message)
    }
  }

  const handleMarkUnread = async (id: string) => {
    try {
      await markInboxUnread(id)
      setThreads(prev => prev.map(t => t.id === id ? { ...t, status: "unread" } : t))
      if (selectedThread?.id === id) {
        setSelectedThread((prev: any) => prev ? { ...prev, status: "unread" } : null)
      }
      setStats(prev => prev ? { ...prev, unread: prev.unread + 1 } : null)
    } catch (err: any) {
      alert("Failed to mark unread: " + err.message)
    }
  }


  const handleSendReply = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!selectedThread || !replyBody.trim()) return

    try {
      setSendingReply(true)
      setSendSuccess(null)
      setSendError(null)

      await sendInboxReply(selectedThread.id, replyBody.trim())
      setSendSuccess("Reply delivered successfully via SES!")
      setReplyBody("")

      const updated = await getInboxThread(selectedThread.id)
      setSelectedThread(updated)

      setThreads(prev => prev.map(t => t.id === selectedThread.id ? { ...t, status: "replied", updatedAt: new Date().toISOString() } : t))
      setStats(prev => prev ? { ...prev, replied: prev.replied + 1 } : null)

      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
      }, 100)
    } catch (err: any) {
      setSendError(err.message || "Failed to send reply. Please check SES credentials.")
    } finally {
      setSendingReply(false)
    }
  }

  const toggleQuote = (msgId: string) => {
    setExpandedQuotes(prev => ({ ...prev, [msgId]: !prev[msgId] }))
  }

  const filteredThreads = threads.filter(t => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      t.contactEmail?.toLowerCase().includes(q) ||
      t.contactName?.toLowerCase().includes(q) ||
      t.subject?.toLowerCase().includes(q) ||
      t.campaign?.name?.toLowerCase().includes(q)
    )
  })

  const formatTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr)
      const now = new Date()
      const diffMs = now.getTime() - d.getTime()
      const diffMins = Math.floor(diffMs / 60000)
      const diffHours = Math.floor(diffMins / 60)
      const diffDays = Math.floor(diffHours / 24)

      if (diffMins < 1) return "just now"
      if (diffMins < 60) return `${diffMins}m ago`
      if (diffHours < 24) return `${diffHours}h ago`
      if (diffDays === 1) return "yesterday"
      if (diffDays < 7) return `${diffDays}d ago`
      return d.toLocaleDateString(undefined, { month: "short", day: "numeric" })
    } catch {
      return dateStr
    }
  }

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Inbox</h1>
            {stats && stats.unread > 0 && (
              <Badge className="bg-blue-600 hover:bg-blue-600 text-white rounded-full px-2.5 py-0.5 text-xs font-semibold">
                {stats.unread} unread
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Read, manage, and reply to inbound prospect emails in real-time.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSyncMailbox}
            disabled={syncing}
            className="gap-2 h-8 text-xs font-medium border-border"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin text-primary" : ""}`} />
            <span>{syncing ? "Syncing Mailbox..." : "Sync Mailbox"}</span>
          </Button>
        </div>
      </div>

      {/* Sync Status Alert */}
      {syncResult && (
        <Alert className="bg-blue-50/80 border-blue-200 text-blue-900 py-2 text-xs rounded-lg flex items-center justify-between">
          <AlertDescription className="flex items-center gap-2">
            <Check className="h-4 w-4 text-blue-600 shrink-0" />
            <span>{syncResult}</span>
          </AlertDescription>
          <button onClick={() => setSyncResult(null)} className="text-blue-700 underline font-semibold text-[11px] ml-4 shrink-0">
            Dismiss
          </button>
        </Alert>
      )}

      {/* Master-Detail Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 h-[calc(100vh-175px)] min-h-[580px]">
        
        {/* Left Column: Thread List (4.5 cols on desktop) */}
        <Card className="md:col-span-5 lg:col-span-4 flex flex-col overflow-hidden border bg-card shadow-xs">
          
          {/* Search & Tabs */}
          <div className="p-3 border-b space-y-2 bg-muted/10">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search leads, subjects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-xs bg-background"
              />
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto pb-0.5 text-xs">
              {[
                { key: "all", label: "All", count: stats?.total },
                { key: "unread", label: "Unread", count: stats?.unread },
                { key: "replied", label: "Replied", count: stats?.replied },
                { key: "archived", label: "Archived", count: stats?.archived },
              ].map((tab) => {
                const isActive = statusFilter === tab.key
                return (
                  <button
                    key={tab.key}
                    onClick={() => setStatusFilter(tab.key)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 ${
                      isActive
                        ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <span>{tab.label}</span>
                    {tab.count !== undefined && tab.count > 0 && (
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isActive ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground font-normal"}`}>
                        {tab.count}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* List Items */}
          <div className="flex-1 overflow-y-auto divide-y divide-border/50">
            {loading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex gap-3 items-start">
                    <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                    <div className="space-y-1.5 flex-1">
                      <div className="flex justify-between">
                        <Skeleton className="h-3.5 w-24" />
                        <Skeleton className="h-3 w-10" />
                      </div>
                      <Skeleton className="h-3 w-36" />
                      <Skeleton className="h-3 w-full" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredThreads.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground flex flex-col items-center justify-center h-full">
                <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center mb-2 text-muted-foreground/60">
                  <Inbox className="h-6 w-6 stroke-1" />
                </div>
                <p className="text-sm font-semibold text-foreground">No conversations</p>
                <p className="text-xs text-muted-foreground mt-0.5 max-w-[200px]">
                  {statusFilter === "unread" 
                    ? "Zero unread replies at the moment."
                    : "When leads reply, conversations will appear here automatically."}
                </p>
              </div>
            ) : (
              filteredThreads.map((thread) => {
                const isSelected = selectedThread?.id === thread.id
                const isUnread = thread.status === "unread"
                const senderName = thread.contactName || thread.contactEmail.split('@')[0]
                const avatarColor = getAvatarColor(thread.contactEmail)
                const initials = getInitials(thread.contactName || thread.contactEmail)

                let cleanPreview = (thread as any).preview || ""
                if (!cleanPreview && (thread as any).messages?.[0]?.body) {
                  cleanPreview = cleanEmailBody((thread as any).messages[0].body).cleanText.slice(0, 120)
                }

                return (
                  <div
                    key={thread.id}
                    onClick={() => handleSelectThread(thread)}
                    className={`p-3 cursor-pointer transition-all flex items-start gap-3 hover:bg-muted/40 ${
                      isSelected 
                        ? "bg-primary/5 border-l-4 border-l-primary" 
                        : isUnread 
                          ? "bg-blue-50/30 dark:bg-blue-950/10" 
                          : ""
                    }`}
                  >
                    {/* Avatar */}
                    <div className={`h-8 w-8 rounded-full ${avatarColor} text-white flex items-center justify-center text-[11px] font-bold shrink-0 shadow-xs mt-0.5`}>
                      {initials}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {isUnread && (
                            <span className="h-2 w-2 rounded-full bg-blue-600 shrink-0" />
                          )}
                          <span className={`text-xs truncate ${isUnread ? "font-bold text-foreground" : "font-medium text-foreground/85"}`}>
                            {senderName}
                          </span>
                        </div>
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0">
                          {formatTime(thread.updatedAt)}
                        </span>
                      </div>

                      {/* Subject */}
                      <p className={`text-xs truncate mt-0.5 ${isUnread ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                        {thread.subject || "(No Subject)"}
                      </p>

                      {/* Clean Message Preview Snippet */}
                      {cleanPreview && (
                        <p className="text-[11px] text-muted-foreground/80 truncate mt-0.5 font-normal">
                          {cleanPreview}
                        </p>
                      )}

                      {/* Tags row */}
                      <div className="flex items-center justify-between gap-2 mt-1.5">
                        <span className="text-[10px] text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded truncate max-w-[140px]">
                          {thread.campaign?.name || "Campaign"}
                        </span>
                        {thread.status === "unread" && (
                          <Badge className="bg-blue-600 text-white text-[9px] px-1.5 py-0 font-medium">Unread</Badge>
                        )}
                        {thread.status === "replied" && (
                          <Badge className="bg-emerald-600 text-white text-[9px] px-1.5 py-0 font-medium">Replied</Badge>
                        )}
                        {thread.status === "archived" && (
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0 text-muted-foreground">Archived</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </Card>

        {/* Right Column: Conversation Stream & Reply Box (7.5 cols) */}
        <Card className="md:col-span-7 lg:col-span-8 flex flex-col overflow-hidden border bg-card shadow-xs">
          {selectedThread ? (
            <div className="flex flex-col h-full">
              
              {/* Conversation Top Header */}
              <div className="px-5 py-3.5 border-b flex items-start justify-between gap-4 bg-muted/15">
                <div className="min-w-0 flex items-start gap-3">
                  <div className={`h-9 w-9 rounded-full ${getAvatarColor(selectedThread.contactEmail)} text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-xs mt-0.5`}>
                    {getInitials(selectedThread.contactName || selectedThread.contactEmail)}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-sm font-bold text-foreground truncate">
                        {selectedThread.contactName || selectedThread.contactEmail}
                      </h2>
                      <span className="text-xs text-muted-foreground">
                        &lt;{selectedThread.contactEmail}&gt;
                      </span>
                      {selectedThread.status === "unread" && (
                        <Badge className="bg-blue-600 text-white text-[10px] px-1.5 py-0">Unread</Badge>
                      )}
                      {selectedThread.status === "replied" && (
                        <Badge className="bg-emerald-600 text-white text-[10px] px-1.5 py-0">Replied</Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                      <span className="font-medium text-foreground/80 truncate">
                        {selectedThread.subject || "(No Subject)"}
                      </span>
                      <span>•</span>
                      {selectedThread.campaign && (
                        <Link 
                          href={`/campaigns/${selectedThread.campaignId}`} 
                          target="_blank"
                          className="hover:underline text-primary flex items-center gap-1 font-medium"
                        >
                          <span>{selectedThread.campaign.name}</span>
                          <ExternalLink className="h-2.5 w-2.5" />
                        </Link>
                      )}
                    </div>
                  </div>
                </div>

                {/* Header Action Buttons */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {selectedThread.status === "archived" ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleUnarchiveThread(selectedThread.id)}
                      className="h-8 text-xs font-semibold text-primary border-primary/30 hover:bg-primary/10 gap-1.5 shadow-xs"
                    >
                      <ArchiveRestore className="h-3.5 w-3.5" />
                      <span>Move to Inbox</span>
                    </Button>
                  ) : (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleMarkUnread(selectedThread.id)}
                        className="h-8 text-xs text-muted-foreground hover:text-foreground gap-1.5"
                        title="Mark conversation as unread"
                      >
                        <Mail className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Mark Unread</span>
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleArchiveThread(selectedThread.id)}
                        className="h-8 text-xs text-muted-foreground hover:text-foreground gap-1.5"
                        title="Archive conversation"
                      >
                        <Archive className="h-3.5 w-3.5" />
                        <span>Archive</span>
                      </Button>
                    </>
                  )}
                </div>

              </div>

              {/* Message Feed Stream */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/5">
                {threadLoading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-24 w-full rounded-xl" />
                    <Skeleton className="h-20 w-3/4 rounded-xl ml-auto" />
                  </div>
                ) : (
                  <>
                    {/* Collapsible Original Sent Campaign */}
                    {selectedThread.campaign && (selectedThread.campaign.renderedHtml || selectedThread.campaign.htmlBody) && (
                      <div className="border border-border/80 rounded-xl bg-card overflow-hidden shadow-2xs">
                        <button
                          type="button"
                          onClick={() => setShowOriginalCampaign(!showOriginalCampaign)}
                          className="w-full px-4 py-2.5 flex items-center justify-between text-xs text-muted-foreground hover:bg-muted/40 transition-colors"
                        >
                          <span className="flex items-center gap-2 font-medium text-foreground/90">
                            <Mail className="h-3.5 w-3.5 text-primary" />
                            Original Outbound Email (Campaign: {selectedThread.campaign.name})
                          </span>
                          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                            {showOriginalCampaign ? "Hide copy" : "View copy"}
                            {showOriginalCampaign ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                          </span>
                        </button>

                        {showOriginalCampaign && (
                          <div className="p-4 border-t bg-muted/10 text-xs leading-relaxed text-foreground/85 border-dashed">
                            <div 
                              className="prose prose-sm max-w-none dark:prose-invert"
                              dangerouslySetInnerHTML={{ 
                                __html: selectedThread.campaign.renderedHtml || selectedThread.campaign.htmlBody 
                              }} 
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {/* Messages in chronological order (deduplicated) */}
                    {(() => {
                      const msgs = selectedThread.messages || []
                      const seen = new Set<string>()
                      const uniqueMsgs = msgs.filter((msg: any) => {
                        const cleaned = cleanEmailBody(msg.body).cleanText.trim()
                        const key = `${msg.direction}_${cleaned}`
                        if (seen.has(key)) return false
                        seen.add(key)
                        return true
                      })

                      if (uniqueMsgs.length === 0) {
                        return (
                          <div className="text-center py-8 text-xs text-muted-foreground">
                            No messages found in this thread.
                          </div>
                        )
                      }

                      return uniqueMsgs.map((msg: any, idx: number) => {
                        const isInbound = msg.direction === "inbound"
                        const msgId = msg.id || String(idx)
                        
                        const cleaned = cleanEmailBody(msg.body)
                        const mainBody = msg.cleanBody || cleaned.cleanText
                        const quotedBody = msg.quotedBody || cleaned.quotedText
                        const isQuoteExpanded = !!expandedQuotes[msgId]

                        return (
                          <div
                            key={msgId}
                            className={`flex flex-col max-w-[90%] ${
                              isInbound ? "mr-auto" : "ml-auto items-end"
                            }`}
                          >

                            {/* Sender Info Line */}
                            <div className="flex items-center gap-2 text-[11px] text-muted-foreground mb-1 px-1">
                              {isInbound ? (
                                <span className="font-semibold text-foreground">
                                  {selectedThread.contactName || selectedThread.contactEmail}
                                </span>
                              ) : (
                                <span className="font-semibold text-primary">
                                  You ({selectedThread.campaign?.fromName || "Daniel Brooks"})
                                </span>
                              )}
                              <span>•</span>
                              <span>{formatTime(msg.sentAt)}</span>
                            </div>

                            {/* Message Body Card */}
                            <div
                              className={`p-4 rounded-2xl text-xs leading-relaxed shadow-xs whitespace-pre-wrap ${
                                isInbound
                                  ? "bg-card border border-border text-foreground rounded-tl-xs"
                                  : "bg-primary text-primary-foreground rounded-tr-xs"
                              }`}
                            >
                              {/* Main Clean Reply Text */}
                              <div className="text-[13px] leading-relaxed font-normal">
                                {mainBody}
                              </div>

                              {/* Quoted History Toggle */}
                              {quotedBody && (
                                <div className="mt-3 pt-2.5 border-t border-border/40">
                                  <button
                                    type="button"
                                    onClick={() => toggleQuote(msgId)}
                                    className={`text-[10px] font-medium flex items-center gap-1 transition-colors ${
                                      isInbound 
                                        ? "text-muted-foreground hover:text-foreground" 
                                        : "text-primary-foreground/80 hover:text-primary-foreground"
                                    }`}
                                  >
                                    <span>{isQuoteExpanded ? "Hide quoted history" : "••• Show quoted history"}</span>
                                    {isQuoteExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                                  </button>

                                  {isQuoteExpanded && (
                                    <div className={`mt-2 p-2.5 rounded text-[11px] font-mono leading-relaxed whitespace-pre-wrap border border-dashed ${
                                      isInbound 
                                        ? "bg-muted/30 text-muted-foreground border-border" 
                                        : "bg-primary-foreground/10 text-primary-foreground/90 border-primary-foreground/20"
                                    }`}>
                                      {quotedBody}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })
                    })()}

                    <div ref={messagesEndRef} />

                  </>
                )}
              </div>

              {/* Reply Composer */}
              <div className="p-3.5 border-t bg-card space-y-2.5">
                {sendSuccess && (
                  <Alert className="bg-emerald-50/80 border-emerald-200 text-emerald-900 py-1.5 text-xs rounded-lg flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                    <AlertDescription className="font-medium">{sendSuccess}</AlertDescription>
                  </Alert>
                )}

                {sendError && (
                  <Alert variant="destructive" className="py-1.5 text-xs rounded-lg flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <AlertDescription className="font-medium">{sendError}</AlertDescription>
                  </Alert>
                )}

                {/* Identity header */}
                <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1">
                  <span>
                    Reply as <strong className="text-foreground">{selectedThread.campaign?.fromName || "Daniel Brooks"}</strong> &lt;{selectedThread.campaign?.fromEmail || "daniel@digireps.org"}&gt;
                  </span>
                  <span className="hidden sm:inline">Press <kbd className="px-1 py-0.5 rounded bg-muted border font-mono text-[10px]">Ctrl+Enter</kbd> to send</span>
                </div>

                <form onSubmit={handleSendReply} className="space-y-2">
                  <Textarea
                    placeholder={`Write your reply to ${selectedThread.contactName || selectedThread.contactEmail}...`}
                    value={replyBody}
                    onChange={(e) => setReplyBody(e.target.value)}
                    onKeyDown={(e) => {
                      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                        e.preventDefault()
                        handleSendReply()
                      }
                    }}
                    rows={3}
                    className="text-xs resize-none bg-background focus-visible:ring-primary leading-relaxed"
                  />

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                      Direct SMTP/SES delivery into prospect inbox
                    </span>

                    <Button
                      type="submit"
                      size="sm"
                      disabled={sendingReply || !replyBody.trim()}
                      className="gap-1.5 text-xs font-semibold h-8"
                    >
                      {sendingReply ? (
                        <>
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          <span>Sending...</span>
                        </>
                      ) : (
                        <>
                          <Send className="h-3.5 w-3.5" />
                          <span>Send Reply</span>
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </div>

            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
              <div className="h-12 w-12 rounded-full bg-muted/60 flex items-center justify-center mb-2.5">
                <MessageSquareReply className="h-6 w-6 text-muted-foreground/60" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">Select a conversation</h3>
              <p className="text-xs text-muted-foreground mt-0.5 max-w-sm">
                Choose a conversation from the left to read prospect replies and write your response.
              </p>
            </div>
          )}
        </Card>

      </div>
    </div>
  )
}

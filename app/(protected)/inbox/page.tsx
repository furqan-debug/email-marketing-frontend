'use client'

import { useEffect, useState, useCallback, useRef } from "react"
import Link from "next/link"
import { 
  Inbox, 
  RefreshCw, 
  Send, 
  Mail, 
  Search, 
  CheckCheck, 
  Archive, 
  Clock, 
  User, 
  Sparkles, 
  ExternalLink,
  AlertCircle,
  MessageSquareReply,
  ArrowRight,
  Check
} from "lucide-react"
import { 
  getInboxThreads, 
  getInboxThread, 
  markInboxRead, 
  archiveInboxThread, 
  sendInboxReply, 
  getInboxStats, 
  syncImapInboxes 
} from "@/lib/api"
import type { InboxThread, InboxStats, InboxMessage } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"

export default function InboxPage() {
  const [threads, setThreads] = useState<InboxThread[]>([])
  const [selectedThread, setSelectedThread] = useState<InboxThread | null>(null)
  const [stats, setStats] = useState<InboxStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [threadLoading, setThreadLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<string | null>(null)
  
  // Filters & Search
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState<string>("")
  
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
      
      setThreads(threadsRes.data || [])
      setStats(statsRes)

      if (preserveSelection && selectedThread) {
        const found = (threadsRes.data || []).find(t => t.id === selectedThread.id)
        if (found) {
          // Re-fetch detailed thread
          const detailed = await getInboxThread(found.id)
          setSelectedThread(detailed)
        }
      } else if (!preserveSelection && threadsRes.data && threadsRes.data.length > 0 && !selectedThread) {
        // Auto-select first thread on desktop
        const firstId = threadsRes.data[0].id
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
      
      const detailed = await getInboxThread(thread.id)
      setSelectedThread(detailed)

      // Mark as read if unread
      if (detailed.status === "unread") {
        await markInboxRead(detailed.id)
        detailed.status = "read"
        setSelectedThread({ ...detailed })
        // Update unread count locally
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
        setSyncResult(`Synced ${res.totalEmailsScanned} email(s) across ${res.syncedInboxes} mailbox(es). Found ${res.matchedReplies} new reply(ies).`)
      } else {
        setSyncResult(res.message || "Sync completed successfully.")
      }
      await loadInbox(statusFilter, true)
    } catch (err: any) {
      setSyncResult("Sync failed: " + (err.message || "Check your IMAP credentials in Railway."))
    } finally {
      setSyncing(false)
    }
  }

  const handleArchiveThread = async (id: string) => {
    try {
      await archiveInboxThread(id)
      setThreads(prev => prev.filter(t => t.id !== id))
      if (selectedThread?.id === id) {
        setSelectedThread(null)
      }
      setStats(prev => prev ? { ...prev, archived: prev.archived + 1 } : null)
    } catch (err: any) {
      alert("Failed to archive thread: " + err.message)
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
      setSendSuccess("Reply sent successfully via SES!")
      setReplyBody("")

      // Refresh current thread to show the new outbound message
      const updated = await getInboxThread(selectedThread.id)
      setSelectedThread(updated)

      // Update thread in list to replied
      setThreads(prev => prev.map(t => t.id === selectedThread.id ? { ...t, status: "replied", updatedAt: new Date().toISOString() } : t))
      setStats(prev => prev ? { ...prev, replied: prev.replied + 1 } : null)

      // Scroll to bottom
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
      }, 100)
    } catch (err: any) {
      setSendError(err.message || "Failed to send reply. Please check your SES credentials.")
    } finally {
      setSendingReply(false)
    }
  }

  // Filtered threads by search query
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "unread":
        return <Badge className="bg-blue-600 text-white hover:bg-blue-600 text-[10px] px-1.5 py-0.5">Unread</Badge>
      case "replied":
        return <Badge className="bg-emerald-600 text-white hover:bg-emerald-600 text-[10px] px-1.5 py-0.5">Replied</Badge>
      case "archived":
        return <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5">Archived</Badge>
      default:
        return <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 text-muted-foreground">Read</Badge>
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Unified Inbox</h1>
            {stats && stats.unread > 0 && (
              <Badge variant="destructive" className="rounded-full px-2 text-xs">
                {stats.unread} unread
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Read campaign replies from your leads and respond directly from one place.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSyncMailbox}
            disabled={syncing}
            className="gap-2 bg-background hover:bg-muted"
          >
            <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin text-primary" : ""}`} />
            <span>{syncing ? "Syncing Mailbox..." : "Sync Mailbox"}</span>
          </Button>
        </div>
      </div>

      {/* Sync Alert if any */}
      {syncResult && (
        <Alert className="bg-primary/5 border-primary/20 text-primary py-2.5">
          <AlertDescription className="text-xs flex items-center justify-between">
            <span>{syncResult}</span>
            <button onClick={() => setSyncResult(null)} className="text-xs underline font-medium ml-2">Dismiss</button>
          </AlertDescription>
        </Alert>
      )}

      {/* Master-Detail Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 min-h-[620px] max-h-[calc(100vh-210px)]">
        
        {/* Left Panel: Thread List (5 cols) */}
        <Card className="md:col-span-5 lg:col-span-4 flex flex-col overflow-hidden border shadow-sm">
          {/* Filters & Search */}
          <div className="p-3 border-b space-y-2.5 bg-muted/20">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search leads or subjects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-9 text-xs bg-background"
              />
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs">
              {[
                { key: "all", label: "All", count: stats?.total },
                { key: "unread", label: "Unread", count: stats?.unread },
                { key: "replied", label: "Replied", count: stats?.replied },
                { key: "archived", label: "Archived", count: stats?.archived },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setStatusFilter(tab.key)}
                  className={`px-2.5 py-1 rounded-md font-medium text-xs whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                    statusFilter === tab.key
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <span>{tab.label}</span>
                  {tab.count !== undefined && tab.count > 0 && (
                    <span className={`text-[10px] px-1 rounded-full ${statusFilter === tab.key ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Thread List Items */}
          <div className="flex-1 overflow-y-auto divide-y">
            {loading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="space-y-2">
                    <div className="flex justify-between">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-12" />
                    </div>
                    <Skeleton className="h-3 w-48" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                ))}
              </div>
            ) : filteredThreads.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground flex flex-col items-center justify-center h-full">
                <Inbox className="h-10 w-10 stroke-1 mb-2 text-muted-foreground/60" />
                <p className="text-sm font-medium">No conversations found</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">
                  {statusFilter === "unread" 
                    ? "You're all caught up! No unread replies."
                    : "When prospects reply to your campaigns, their messages will appear here."}
                </p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleSyncMailbox} 
                  disabled={syncing}
                  className="mt-4 text-xs gap-1.5"
                >
                  <RefreshCw className={`h-3 w-3 ${syncing ? "animate-spin" : ""}`} />
                  Check Mailbox Now
                </Button>
              </div>
            ) : (
              filteredThreads.map((thread) => {
                const isSelected = selectedThread?.id === thread.id
                return (
                  <div
                    key={thread.id}
                    onClick={() => handleSelectThread(thread)}
                    className={`p-3.5 cursor-pointer transition-colors text-left flex flex-col gap-1 hover:bg-muted/40 ${
                      isSelected ? "bg-muted/70 border-l-4 border-l-primary" : ""
                    } ${thread.status === "unread" ? "bg-primary/[0.03] font-medium" : ""}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {thread.status === "unread" && (
                          <span className="h-2 w-2 rounded-full bg-blue-600 shrink-0" />
                        )}
                        <span className={`text-xs truncate ${thread.status === "unread" ? "font-bold text-foreground" : "font-medium text-foreground/90"}`}>
                          {thread.contactName || thread.contactEmail}
                        </span>
                      </div>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0">
                        {formatTime(thread.updatedAt)}
                      </span>
                    </div>

                    <p className="text-xs text-foreground/80 truncate">
                      {thread.subject || "(No subject)"}
                    </p>

                    <div className="flex items-center justify-between gap-2 mt-1">
                      <span className="text-[10px] text-muted-foreground truncate max-w-[150px] bg-muted/60 px-1.5 py-0.5 rounded">
                        {thread.campaign?.name || "Campaign"}
                      </span>
                      {getStatusBadge(thread.status)}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </Card>

        {/* Right Panel: Selected Thread & Reply Composer (7 cols) */}
        <Card className="md:col-span-7 lg:col-span-8 flex flex-col overflow-hidden border shadow-sm">
          {selectedThread ? (
            <div className="flex flex-col h-full">
              {/* Thread Header */}
              <div className="p-4 border-b flex items-start justify-between gap-4 bg-muted/10">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-semibold truncate">
                      {selectedThread.subject || "(No subject)"}
                    </h2>
                    {getStatusBadge(selectedThread.status)}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground mt-1">
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3 text-muted-foreground" />
                      <strong className="text-foreground">{selectedThread.contactName || selectedThread.contactEmail}</strong>
                      {selectedThread.contactName && <span>({selectedThread.contactEmail})</span>}
                    </span>

                    {selectedThread.campaign && (
                      <span className="flex items-center gap-1 text-primary">
                        <ArrowRight className="h-3 w-3" />
                        <Link 
                          href={`/campaigns/${selectedThread.campaignId}`} 
                          className="hover:underline flex items-center gap-1 font-medium"
                          target="_blank"
                        >
                          {selectedThread.campaign.name}
                          <ExternalLink className="h-2.5 w-2.5" />
                        </Link>
                      </span>
                    )}
                  </div>
                </div>

                {/* Header Action Buttons */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {selectedThread.status !== "archived" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleArchiveThread(selectedThread.id)}
                      title="Archive thread"
                      className="h-8 text-xs text-muted-foreground hover:text-foreground"
                    >
                      <Archive className="h-3.5 w-3.5 mr-1" />
                      Archive
                    </Button>
                  )}
                </div>
              </div>

              {/* Message Feed */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/5">
                {threadLoading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-24 w-full rounded-lg" />
                    <Skeleton className="h-20 w-3/4 rounded-lg ml-auto" />
                  </div>
                ) : (
                  <>
                    {/* 1. Show original campaign message if available */}
                    {selectedThread.campaign?.htmlBody && (
                      <div className="border rounded-lg bg-card p-4 shadow-sm space-y-2 border-primary/20">
                        <div className="flex items-center justify-between text-xs border-b pb-2 text-muted-foreground">
                          <span className="font-medium text-foreground flex items-center gap-1.5">
                            <Mail className="h-3.5 w-3.5 text-primary" />
                            Original Sent Campaign
                          </span>
                          <span className="text-[11px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                            Sent to {selectedThread.contactEmail}
                          </span>
                        </div>
                        <div 
                          className="text-xs text-foreground/80 leading-relaxed max-h-48 overflow-y-auto prose prose-sm max-w-none pt-1"
                          dangerouslySetInnerHTML={{ __html: selectedThread.campaign.htmlBody }}
                        />
                      </div>
                    )}

                    {/* 2. Render all thread messages in chronological order */}
                    {selectedThread.messages && selectedThread.messages.length > 0 ? (
                      selectedThread.messages.map((msg, idx) => {
                        const isInbound = msg.direction === "inbound"
                        return (
                          <div
                            key={msg.id || idx}
                            className={`flex flex-col max-w-[85%] ${
                              isInbound ? "mr-auto" : "ml-auto items-end"
                            }`}
                          >
                            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-1 px-1">
                              {isInbound ? (
                                <>
                                  <span className="font-semibold text-foreground">
                                    {selectedThread.contactName || selectedThread.contactEmail}
                                  </span>
                                  <span>replied</span>
                                </>
                              ) : (
                                <>
                                  <span className="font-semibold text-primary">You</span>
                                  <span>sent</span>
                                </>
                              )}
                              <span>•</span>
                              <span>{formatTime(msg.sentAt)}</span>
                            </div>

                            <div
                              className={`p-3.5 rounded-xl text-xs leading-relaxed shadow-sm whitespace-pre-wrap ${
                                isInbound
                                  ? "bg-card border text-foreground rounded-tl-sm"
                                  : "bg-primary text-primary-foreground rounded-tr-sm"
                              }`}
                            >
                              {msg.body}
                            </div>
                          </div>
                        )
                      })
                    ) : (
                      <div className="text-center py-6 text-xs text-muted-foreground">
                        No reply body captured. Syncing with mailbox will fetch new replies.
                      </div>
                    )}

                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              {/* Reply Compose Box */}
              <div className="p-3.5 border-t bg-card space-y-2.5">
                {sendSuccess && (
                  <Alert className="bg-emerald-500/10 border-emerald-500/30 text-emerald-600 py-1.5 text-xs">
                    <AlertDescription className="flex items-center gap-1.5">
                      <Check className="h-3.5 w-3.5" />
                      {sendSuccess}
                    </AlertDescription>
                  </Alert>
                )}

                {sendError && (
                  <Alert variant="destructive" className="py-1.5 text-xs">
                    <AlertDescription className="flex items-center gap-1.5">
                      <AlertCircle className="h-3.5 w-3.5" />
                      {sendError}
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1">
                  <span>
                    Reply to <strong className="text-foreground">{selectedThread.contactEmail}</strong>
                    {selectedThread.campaign?.fromEmail && (
                      <span> as <span className="text-primary">{selectedThread.campaign.fromName || "Team"} &lt;{selectedThread.campaign.fromEmail}&gt;</span></span>
                    )}
                  </span>
                  <span>(Cmd/Ctrl + Enter to send)</span>
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
                    className="text-xs resize-none bg-background focus-visible:ring-primary"
                  />

                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground">
                      Sent via AWS SES directly into prospect's inbox
                    </span>
                    <Button
                      type="submit"
                      size="sm"
                      disabled={sendingReply || !replyBody.trim()}
                      className="gap-1.5 text-xs font-medium"
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
              <div className="h-14 w-14 rounded-full bg-muted/60 flex items-center justify-center mb-3">
                <MessageSquareReply className="h-6 w-6 text-muted-foreground/70" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">Select a conversation</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                Choose a reply thread from the list on the left to read prospect responses and reply directly.
              </p>
            </div>
          )}
        </Card>

      </div>
    </div>
  )
}

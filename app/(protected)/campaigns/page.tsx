'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { 
  Send, 
  PlusCircle, 
  RefreshCw, 
  AlertCircle, 
  ChevronRight, 
  Trash2,
  Loader2,
  Eye, 
  MousePointerClick, 
  BarChart3,
  Clock,
  Edit3,
  Search,
  Sparkles,
  Layers,
  Activity,
  CheckCircle2,
  Filter
} from 'lucide-react'

import { getCampaigns, deleteCampaign } from '@/lib/api'
import type { Campaign } from '@/lib/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { formatRate } from '@/lib/utils'

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Filter & Search state
  const [activeTab, setActiveTab] = useState<'all' | 'sending' | 'completed' | 'draft'>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Delete State
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [deleteConfirmName, setDeleteConfirmName] = useState<string>('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  async function loadCampaignsList() {
    setLoading(true)
    setError(null)
    try {
      const res = await getCampaigns()
      setCampaigns(res || [])
    } catch (err: any) {
      setError(err.message || 'Failed to load campaigns')
    } finally {
      setLoading(false)
    }
  }

  function handleDelete(id: string, name: string, e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setDeleteConfirmId(id)
    setDeleteConfirmName(name)
    setDeleteError(null)
  }

  async function confirmDelete() {
    if (!deleteConfirmId) return
    setDeletingId(deleteConfirmId)
    setDeleteError(null)
    try {
      await deleteCampaign(deleteConfirmId)
      setDeleteConfirmId(null)
      setDeleteConfirmName('')
      await loadCampaignsList()
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to delete campaign.')
    } finally {
      setDeletingId(null)
    }
  }

  useEffect(() => {
    loadCampaignsList()
  }, [])

  // Metrics computation
  const stats = useMemo(() => {
    const total = campaigns.length
    const sending = campaigns.filter(c => c.status === 'SENDING').length
    const completed = campaigns.filter(c => c.status === 'COMPLETED').length
    const drafts = campaigns.filter(c => c.status === 'DRAFT').length
    
    let totalSent = 0
    let totalOpened = 0
    campaigns.forEach(c => {
      if (c.snapshot) {
        totalSent += c.snapshot.sent || 0
        totalOpened += c.snapshot.opened || 0
      }
    })
    const avgOpenRate = totalSent > 0 ? (totalOpened / totalSent) : 0
    return { total, sending, completed, drafts, totalSent, totalOpened, avgOpenRate }
  }, [campaigns])

  // Filtered campaigns
  const filteredCampaigns = useMemo(() => {
    return campaigns.filter(c => {
      // Tab filter
      if (activeTab === 'sending' && c.status !== 'SENDING') return false
      if (activeTab === 'completed' && c.status !== 'COMPLETED') return false
      if (activeTab === 'draft' && c.status !== 'DRAFT') return false

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const nameMatch = c.name.toLowerCase().includes(q)
        const subjectMatch = c.subject ? c.subject.toLowerCase().includes(q) : false
        return nameMatch || subjectMatch
      }
      return true
    })
  }, [campaigns, activeTab, searchQuery])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Completed
          </span>
        )
      case 'SENDING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30 animate-pulse">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-ping" />
            Sending...
          </span>
        )
      case 'PAUSED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            Paused
          </span>
        )
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
            Cancelled
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary text-muted-foreground border border-border">
            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
            Draft
          </span>
        )
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight">Campaigns</h1>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
              {campaigns.length} Total
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Build, dispatch, and track high-velocity cold email sequences and broadcasts
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button variant="outline" size="sm" onClick={loadCampaignsList} disabled={loading} className="glass-panel">
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button asChild size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md shadow-primary/20">
            <Link href="/campaigns/new">
              <PlusCircle className="h-4 w-4 mr-1.5" />
              New Sequence
            </Link>
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Metric Quick-Pills Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="glass-panel p-3.5 rounded-xl border border-border/60">
          <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Active Sending</div>
          <div className="text-xl font-bold font-mono text-blue-500 mt-1 flex items-center gap-2">
            {stats.sending}
            {stats.sending > 0 && <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />}
          </div>
        </div>
        <div className="glass-panel p-3.5 rounded-xl border border-border/60">
          <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Completed</div>
          <div className="text-xl font-bold font-mono text-emerald-500 mt-1">{stats.completed}</div>
        </div>
        <div className="glass-panel p-3.5 rounded-xl border border-border/60">
          <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Draft Sequences</div>
          <div className="text-xl font-bold font-mono text-muted-foreground mt-1">{stats.drafts}</div>
        </div>
        <div className="glass-panel p-3.5 rounded-xl border border-border/60">
          <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Avg Open Rate</div>
          <div className="text-xl font-bold font-mono text-foreground mt-1">{formatRate(stats.avgOpenRate)}</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-1.5 p-1 bg-muted/60 rounded-xl border border-border/50 max-w-fit">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'all'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            All ({campaigns.length})
          </button>
          <button
            onClick={() => setActiveTab('sending')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'sending'
                ? 'bg-background text-blue-500 shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Sending ({stats.sending})
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'completed'
                ? 'bg-background text-emerald-500 shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Completed ({stats.completed})
          </button>
          <button
            onClick={() => setActiveTab('draft')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'draft'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Drafts ({stats.drafts})
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search campaigns & subjects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-xs bg-background/60 rounded-xl"
          />
        </div>
      </div>

      {/* Campaigns Table */}
      <Card className="glass-panel border-border/70 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-4">
              <Skeleton className="h-12 w-full rounded-lg" />
              <Skeleton className="h-12 w-full rounded-lg" />
              <Skeleton className="h-12 w-full rounded-lg" />
            </div>
          ) : filteredCampaigns.length === 0 ? (
            <div className="text-center py-16 px-4">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/80 text-muted-foreground mb-4">
                <Send className="h-6 w-6" />
              </div>
              <p className="text-base font-semibold text-foreground">No campaigns found</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto mb-5">
                {searchQuery
                  ? `No campaigns match "${searchQuery}". Try clearing your search.`
                  : 'Get started by creating your first multi-step cold outreach sequence or broadcast.'}
              </p>
              <Button asChild size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground">
                <Link href="/campaigns/new">
                  <PlusCircle className="mr-1.5 h-4 w-4" />
                  Create Sequence
                </Link>
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-border/70 hover:bg-transparent">
                    <TableHead className="font-semibold text-xs py-3.5 pl-6">Campaign & Subject</TableHead>
                    <TableHead className="font-semibold text-xs py-3.5">Status</TableHead>
                    <TableHead className="font-semibold text-xs py-3.5 text-right">Sent</TableHead>
                    <TableHead className="font-semibold text-xs py-3.5 text-right">Unique Opens</TableHead>
                    <TableHead className="font-semibold text-xs py-3.5 text-right">Unique Clicks</TableHead>
                    <TableHead className="font-semibold text-xs py-3.5 text-right">Open Rate</TableHead>
                    <TableHead className="font-semibold text-xs py-3.5 text-right pr-6">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCampaigns.map((c) => {
                    const snap = c.snapshot
                    const openRate = snap && snap.sent > 0 ? (snap.opened / snap.sent) : 0
                    const clickRate = snap && snap.sent > 0 ? (snap.clicked / snap.sent) : 0
                    
                    return (
                      <TableRow 
                        key={c.id} 
                        className="cursor-pointer hover:bg-muted/40 transition-colors border-b border-border/50 group"
                        onClick={() => {
                          window.location.href = c.status === 'DRAFT' ? `/campaigns/${c.id}/edit` : `/campaigns/${c.id}`
                        }}
                      >
                        <TableCell className="py-4 pl-6">
                          <div className="flex items-start gap-3">
                            <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                              <Send className="h-4 w-4" />
                            </div>
                            <div>
                              <div className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors flex items-center gap-2">
                                {c.name}
                              </div>
                              {c.subject ? (
                                <div className="text-xs text-muted-foreground line-clamp-1 max-w-sm mt-0.5">
                                  {c.subject}
                                </div>
                              ) : (
                                <div className="text-xs text-muted-foreground/60 italic mt-0.5">
                                  Multi-step sequence
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-4">{getStatusBadge(c.status)}</TableCell>
                        <TableCell className="py-4 text-right font-mono text-xs font-semibold">
                          {snap ? snap.sent.toLocaleString() : '—'}
                        </TableCell>
                        <TableCell className="py-4 text-right font-mono text-xs">
                          {snap ? (
                            <div>
                              <span className="font-semibold text-foreground">{snap.opened}</span>
                              <span className="text-[10px] text-muted-foreground ml-1">({snap.totalOpens} tot)</span>
                            </div>
                          ) : '—'}
                        </TableCell>
                        <TableCell className="py-4 text-right font-mono text-xs">
                          {snap ? (
                            <div>
                              <span className="font-semibold text-foreground">{snap.clicked}</span>
                              <span className="text-[10px] text-muted-foreground ml-1">({snap.totalClicks} tot)</span>
                            </div>
                          ) : '—'}
                        </TableCell>
                        <TableCell className="py-4 text-right">
                          {snap && snap.sent > 0 ? (
                            <div className="flex flex-col items-end gap-1">
                              <span className="font-mono text-xs font-bold text-foreground">
                                {formatRate(openRate)}
                              </span>
                              <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-gradient-to-r from-primary to-indigo-500 rounded-full"
                                  style={{ width: `${Math.min(openRate * 100, 100)}%` }}
                                />
                              </div>
                            </div>
                          ) : (
                            <span className="font-mono text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="py-4 text-right pr-6" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            {c.status === 'DRAFT' ? (
                              <Button 
                                variant="outline" 
                                size="sm" 
                                asChild 
                                className="h-8 text-xs font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/20"
                              >
                                <Link href={`/campaigns/${c.id}/edit`}>
                                  <Edit3 className="mr-1 h-3.5 w-3.5" />
                                  Edit Draft
                                </Link>
                              </Button>
                            ) : (
                              <Button variant="ghost" size="sm" asChild className="h-8 text-xs font-medium hover:bg-primary/10 hover:text-primary">
                                <Link href={`/campaigns/${c.id}`}>
                                  Analytics
                                  <ChevronRight className="ml-1 h-3.5 w-3.5" />
                                </Link>
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                              disabled={deletingId === c.id}
                              onClick={(e) => handleDelete(c.id, c.name, e)}
                              title="Delete campaign"
                            >
                              {deletingId === c.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirmId} onOpenChange={(open) => {
        if (!open) { setDeleteConfirmId(null); setDeleteConfirmName(''); setDeleteError(null) }
      }}>
        <DialogContent className="glass-panel border-border/80">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">Delete Campaign</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground pt-1">
              Are you sure you want to delete <strong className="text-foreground">"{deleteConfirmName}"</strong>?
              This will permanently delete the campaign, all queued/sent sequence messages, tracking events, and analytics snapshots.
            </DialogDescription>
          </DialogHeader>
          {deleteError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">{deleteError}</AlertDescription>
            </Alert>
          )}
          <DialogFooter className="gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setDeleteConfirmId(null); setDeleteConfirmName(''); setDeleteError(null) }}
              disabled={!!deletingId}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={confirmDelete}
              disabled={!!deletingId}
            >
              {deletingId ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Trash2 className="h-4 w-4 mr-1.5" />}
              Delete Permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
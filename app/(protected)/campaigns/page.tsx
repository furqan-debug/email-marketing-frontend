'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import {
  PlusCircle,
  RefreshCw,
  AlertCircle,
  Trash2,
  Loader2,
  Edit3,
  ChevronRight,
  Search,
} from 'lucide-react'
import { getCampaigns, deleteCampaign } from '@/lib/api'
import type { Campaign } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { formatRate } from '@/lib/utils'

function StatusDot({ status }: { status: string }) {
  if (status === 'SENDING') return (
    <span className="flex items-center gap-1.5 text-[13px] font-medium text-blue-600">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-500 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
      </span>
      Live
    </span>
  )
  if (status === 'COMPLETED') return (
    <span className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
      <span className="h-2 w-2 rounded-full bg-emerald-500" />Done
    </span>
  )
  if (status === 'PAUSED') return (
    <span className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
      <span className="h-2 w-2 rounded-full bg-amber-500" />Paused
    </span>
  )
  if (status === 'CANCELLED') return (
    <span className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
      <span className="h-2 w-2 rounded-full bg-red-400" />Cancelled
    </span>
  )
  return <span className="text-[13px] text-muted-foreground">Draft</span>
}

const TABS = [
  { key: 'all',       label: 'All' },
  { key: 'SENDING',   label: 'Live' },
  { key: 'COMPLETED', label: 'Completed' },
  { key: 'DRAFT',     label: 'Draft' },
] as const

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState<string | null>(null)
  const [tab,       setTab]       = useState<string>('all')
  const [q,         setQ]         = useState('')

  const [deleteId,   setDeleteId]   = useState<string | null>(null)
  const [deleteName, setDeleteName] = useState('')
  const [deleting,   setDeleting]   = useState(false)
  const [deleteErr,  setDeleteErr]  = useState<string | null>(null)

  async function load() {
    setLoading(true); setError(null)
    try { setCampaigns(await getCampaigns() || []) }
    catch (e: any) { setError(e.message || 'Failed') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const filtered = useMemo(() => {
    let list = campaigns
    if (tab !== 'all') list = list.filter(c => c.status === tab)
    if (q.trim()) {
      const lq = q.toLowerCase()
      list = list.filter(c =>
        c.name.toLowerCase().includes(lq) ||
        (c.subject || '').toLowerCase().includes(lq)
      )
    }
    return list
  }, [campaigns, tab, q])

  const counts = useMemo(() => ({
    all:       campaigns.length,
    SENDING:   campaigns.filter(c => c.status === 'SENDING').length,
    COMPLETED: campaigns.filter(c => c.status === 'COMPLETED').length,
    DRAFT:     campaigns.filter(c => c.status === 'DRAFT').length,
  }), [campaigns])

  async function confirmDelete() {
    if (!deleteId) return
    setDeleting(true); setDeleteErr(null)
    try {
      await deleteCampaign(deleteId)
      setDeleteId(null)
      await load()
    } catch (e: any) { setDeleteErr(e.message || 'Failed') }
    finally { setDeleting(false) }
  }

  return (
    <div className="space-y-5">

      {/* header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">Campaigns</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading} className="h-8 text-xs gap-1.5">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button asChild size="sm" className="h-8 text-xs gap-1.5 shadow-sm">
            <Link href="/campaigns/new">
              <PlusCircle className="h-3.5 w-3.5" />
              New Campaign
            </Link>
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive border border-destructive/30 rounded-md px-3 py-2 bg-destructive/5">
          <AlertCircle className="h-4 w-4 shrink-0" />{error}
        </div>
      )}

      {/* tabs + search */}
      <div className="flex items-center justify-between gap-4 border-b border-border">
        <div className="flex items-center gap-0">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                tab === t.key
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {t.label}
              <span className={`ml-1.5 text-[11px] tabular-nums ${
                tab === t.key ? 'text-muted-foreground' : 'text-muted-foreground/60'
              }`}>
                {counts[t.key as keyof typeof counts]}
              </span>
            </button>
          ))}
        </div>
        <div className="relative pb-px">
          <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search campaigns..."
            className="pl-8 h-8 text-xs w-52 bg-background"
          />
        </div>
      </div>

      {/* table */}
      <div className="border border-border rounded-lg overflow-hidden">
        {/* header row */}
        <div className="grid grid-cols-[1fr_100px_80px_80px_80px_64px_60px] text-[11px] font-semibold uppercase tracking-wider text-muted-foreground bg-muted/40 border-b border-border px-4 py-2.5">
          <div>Campaign</div>
          <div>Status</div>
          <div className="text-right">Sent</div>
          <div className="text-right">Open%</div>
          <div className="text-right">Replies</div>
          <div className="text-right">Action</div>
          <div />
        </div>

        {loading ? (
          <div className="divide-y divide-border">
            {[1,2,3,4].map(i => (
              <div key={i} className="grid grid-cols-[1fr_100px_80px_80px_80px_64px_60px] px-4 py-3 items-center">
                <div className="space-y-1.5"><Skeleton className="h-4 w-40" /><Skeleton className="h-3 w-56" /></div>
                <Skeleton className="h-4 w-14" />
                <Skeleton className="h-4 w-10 ml-auto" />
                <Skeleton className="h-4 w-10 ml-auto" />
                <Skeleton className="h-4 w-8 ml-auto" />
                <Skeleton className="h-4 w-8 ml-auto" />
                <div />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <p className="text-sm text-muted-foreground">
              {q ? `No campaigns match "${q}".` : 'No campaigns yet.'}
            </p>
            {!q && (
              <Button asChild size="sm" className="mt-3 h-8 text-xs">
                <Link href="/campaigns/new">Create one</Link>
              </Button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map(c => {
              const snap     = c.snapshot
              const openRate = snap && snap.sent > 0 ? snap.opened / snap.sent : 0
              const href     = c.status === 'DRAFT' ? `/campaigns/${c.id}/edit` : `/campaigns/${c.id}`
              return (
                <div
                  key={c.id}
                  className="grid grid-cols-[1fr_100px_80px_80px_80px_64px_60px] px-4 py-3 items-center hover:bg-muted/30 transition-colors cursor-pointer group"
                  onClick={() => { window.location.href = href }}
                >
                  {/* name + subject */}
                  <div className="min-w-0 pr-4">
                    <div className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                      {c.name}
                    </div>
                    {c.subject && (
                      <div className="text-[12px] text-muted-foreground truncate mt-0.5">{c.subject}</div>
                    )}
                  </div>
                  {/* status */}
                  <div><StatusDot status={c.status} /></div>
                  {/* sent */}
                  <div className="text-right font-mono text-[13px] text-muted-foreground">
                    {snap ? snap.sent.toLocaleString() : '—'}
                  </div>
                  {/* open rate */}
                  <div className="text-right font-mono text-[13px]">
                    {snap && snap.sent > 0 ? (
                      <span className={openRate > 0.3 ? 'text-emerald-600 font-semibold' : 'text-muted-foreground'}>
                        {formatRate(openRate)}
                      </span>
                    ) : '—'}
                  </div>
                  {/* replies */}
                  <div className="text-right font-mono text-[13px]">
                    {snap
                      ? snap.replied > 0
                        ? <span className="font-semibold">{snap.replied}</span>
                        : <span className="text-muted-foreground">0</span>
                      : '—'}
                  </div>
                  {/* view/edit link */}
                  <div className="text-right" onClick={e => e.stopPropagation()}>
                    {c.status === 'DRAFT' ? (
                      <Link href={`/campaigns/${c.id}/edit`}
                        className="text-[12px] font-medium text-muted-foreground hover:text-primary transition-colors">
                        Edit
                      </Link>
                    ) : (
                      <Link href={`/campaigns/${c.id}`}
                        className="text-[12px] font-medium text-muted-foreground hover:text-primary transition-colors flex items-center justify-end gap-0.5">
                        View <ChevronRight className="h-3 w-3" />
                      </Link>
                    )}
                  </div>
                  {/* delete */}
                  <div className="text-right" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => { setDeleteId(c.id); setDeleteName(c.name); setDeleteErr(null) }}
                      className="p-1 text-muted-foreground/40 hover:text-destructive transition-colors rounded opacity-0 group-hover:opacity-100"
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* delete dialog */}
      <Dialog open={!!deleteId} onOpenChange={open => { if (!open) { setDeleteId(null); setDeleteErr(null) } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete campaign?</DialogTitle>
            <DialogDescription className="text-sm">
              <strong>"{deleteName}"</strong> and all its messages, tracking events, and analytics will be permanently removed.
            </DialogDescription>
          </DialogHeader>
          {deleteErr && (
            <p className="text-xs text-destructive">{deleteErr}</p>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => { setDeleteId(null) }} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" size="sm" onClick={confirmDelete} disabled={deleting}>
              {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Trash2 className="h-4 w-4 mr-1.5" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}
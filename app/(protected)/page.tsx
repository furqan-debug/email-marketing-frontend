'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  PlusCircle,
  RefreshCw,
  AlertCircle,
  ChevronRight,
  CornerDownLeft,
} from 'lucide-react'
import { getCampaigns, getAudiences, getInboxThreads } from '@/lib/api'
import type { Campaign, Audience, InboxThread } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { formatRate } from '@/lib/utils'

// ── helpers ──────────────────────────────────────────────
function getInitials(name: string) {
  const p = name.trim().split(/\s+/)
  return p.length >= 2 ? (p[0][0] + p[1][0]).toUpperCase() : name.slice(0, 2).toUpperCase()
}

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60_000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return d === 1 ? 'yesterday' : `${d}d ago`
}

const AVATAR_COLORS = [
  'bg-blue-500', 'bg-violet-500', 'bg-emerald-500',
  'bg-amber-500', 'bg-rose-500', 'bg-cyan-500', 'bg-indigo-500',
]
function avatarColor(email: string) {
  let h = 0
  for (const c of email) h = (h * 31 + c.charCodeAt(0)) | 0
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}

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
      <span className="h-2 w-2 rounded-full bg-emerald-500" />
      Done
    </span>
  )
  if (status === 'PAUSED') return (
    <span className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
      <span className="h-2 w-2 rounded-full bg-amber-500" />
      Paused
    </span>
  )
  if (status === 'CANCELLED') return (
    <span className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
      <span className="h-2 w-2 rounded-full bg-red-500" />
      Cancelled
    </span>
  )
  return <span className="text-[13px] text-muted-foreground">Draft</span>
}

// ── page ──────────────────────────────────────────────────
export default function DashboardPage() {
  const [campaigns,  setCampaigns]  = useState<Campaign[]>([])
  const [audiences,  setAudiences]  = useState<Audience[]>([])
  const [threads,    setThreads]    = useState<InboxThread[]>([])
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [c, a, t] = await Promise.allSettled([
        getCampaigns(),
        getAudiences(),
        getInboxThreads(1, 5, 'unread'),
      ])
      if (c.status === 'fulfilled') setCampaigns(c.value || [])
      if (a.status === 'fulfilled') setAudiences(a.value || [])
      if (t.status === 'fulfilled') setThreads(t.value?.data || [])
    } catch (e: any) {
      setError(e.message || 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // ── derived stats ──
  const totalContacts  = audiences.reduce((s, a) => s + (a._count?.contacts || 0), 0)
  const totalSent      = campaigns.reduce((s, c) => s + (c.snapshot?.sent    || 0), 0)
  const totalReplied   = campaigns.reduce((s, c) => s + (c.snapshot?.replied || 0), 0)
  const activeCmps     = campaigns.filter(c => c.status === 'SENDING').length
  const replyRate      = totalSent > 0 ? totalReplied / totalSent : 0
  const recentCmps     = campaigns.slice(0, 8)

  return (
    <div className="space-y-6">

      {/* ── header ── */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">Overview</h1>
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
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* ── compact stat strip ── */}
      <div className="flex items-center gap-3 text-sm border-b border-border pb-5">
        {loading ? (
          <Skeleton className="h-5 w-64" />
        ) : (
          <>
            <span>
              <strong className="font-semibold tabular-nums">{totalContacts.toLocaleString()}</strong>
              <span className="text-muted-foreground ml-1">contacts</span>
            </span>
            <span className="text-border select-none">·</span>
            <span>
              <strong className="font-semibold tabular-nums">{campaigns.length}</strong>
              <span className="text-muted-foreground ml-1">campaigns</span>
              {activeCmps > 0 && (
                <span className="ml-1.5 text-xs font-medium text-blue-600 tabular-nums">({activeCmps} live)</span>
              )}
            </span>
            <span className="text-border select-none">·</span>
            <span>
              <strong className="font-semibold tabular-nums">{totalSent.toLocaleString()}</strong>
              <span className="text-muted-foreground ml-1">sent</span>
            </span>
            <span className="text-border select-none">·</span>
            <span>
              <strong className="font-semibold tabular-nums">{formatRate(replyRate)}</strong>
              <span className="text-muted-foreground ml-1">reply rate</span>
            </span>
          </>
        )}
      </div>

      {/* ── campaigns table ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold">Campaigns</h2>
          <Link href="/campaigns" className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors">
            View all <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="border border-border rounded-lg overflow-hidden">
          {/* table header */}
          <div className="grid grid-cols-[1fr_100px_80px_80px_80px_80px] text-[11px] font-semibold uppercase tracking-wider text-muted-foreground bg-muted/40 border-b border-border px-4 py-2.5">
            <div>Campaign</div>
            <div>Status</div>
            <div className="text-right">Sent</div>
            <div className="text-right">Opens</div>
            <div className="text-right">Replies</div>
            <div className="text-right">Action</div>
          </div>

          {loading ? (
            <div className="divide-y divide-border">
              {[1,2,3].map(i => (
                <div key={i} className="grid grid-cols-[1fr_100px_80px_80px_80px_80px] px-4 py-3 items-center gap-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-10 ml-auto" />
                  <Skeleton className="h-4 w-10 ml-auto" />
                  <Skeleton className="h-4 w-10 ml-auto" />
                  <Skeleton className="h-4 w-12 ml-auto" />
                </div>
              ))}
            </div>
          ) : recentCmps.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <p className="text-sm text-muted-foreground">No campaigns yet.</p>
              <Button asChild size="sm" className="mt-3 h-8 text-xs">
                <Link href="/campaigns/new">Create one</Link>
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {recentCmps.map(c => {
                const snap = c.snapshot
                const openRate = snap && snap.sent > 0 ? snap.opened / snap.sent : 0
                const href = c.status === 'DRAFT' ? `/campaigns/${c.id}/edit` : `/campaigns/${c.id}`
                return (
                  <div
                    key={c.id}
                    className="grid grid-cols-[1fr_100px_80px_80px_80px_80px] px-4 py-3 items-center hover:bg-muted/30 transition-colors cursor-pointer group"
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
                      {snap ? (
                        snap.replied > 0
                          ? <span className="font-semibold">{snap.replied}</span>
                          : <span className="text-muted-foreground">0</span>
                      ) : '—'}
                    </div>
                    {/* action */}
                    <div className="text-right" onClick={e => e.stopPropagation()}>
                      <Link
                        href={href}
                        className="text-[12px] font-medium text-primary hover:underline"
                      >
                        {c.status === 'DRAFT' ? 'Edit' : 'View'}
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── latest replies ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold">
            Latest Replies
            {threads.length > 0 && (
              <span className="ml-2 text-[11px] font-normal text-muted-foreground tabular-nums">
                {threads.length} unread
              </span>
            )}
          </h2>
          <Link href="/inbox" className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors">
            Open inbox <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="border border-border rounded-lg overflow-hidden">
          {loading ? (
            <div className="divide-y divide-border">
              {[1,2].map(i => (
                <div key={i} className="flex items-start gap-3 px-4 py-3">
                  <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="h-3.5 w-40" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : threads.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-muted-foreground">No unread replies.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {threads.map(thread => {
                const name = thread.contactName || thread.contactEmail.split('@')[0]
                const preview = (thread as any).preview || ''
                const time = relativeTime((thread as any).lastActivityAt || thread.updatedAt)
                return (
                  <div key={thread.id} className="flex items-start gap-3 px-4 py-3 hover:bg-muted/30 transition-colors group">
                    {/* avatar */}
                    <div className={`h-8 w-8 rounded-full ${avatarColor(thread.contactEmail)} text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5`}>
                      {getInitials(name)}
                    </div>
                    {/* content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-foreground truncate">{name}</span>
                        <span className="text-[11px] text-muted-foreground whitespace-nowrap shrink-0">{time}</span>
                      </div>
                      <div className="text-[12px] text-muted-foreground truncate mt-0.5">
                        {thread.campaign?.name && (
                          <span className="text-muted-foreground/70">{thread.campaign.name} · </span>
                        )}
                        {preview || thread.subject || '(no preview)'}
                      </div>
                    </div>
                    {/* reply link */}
                    <Link
                      href="/inbox"
                      className="shrink-0 flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-primary transition-colors opacity-0 group-hover:opacity-100"
                    >
                      Reply <CornerDownLeft className="h-3 w-3" />
                    </Link>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

    </div>
  )
}

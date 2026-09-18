'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  RefreshCw,
  AlertCircle,
  Search,
  Loader2,
  PlusCircle,
  Trash2,
  ExternalLink,
  Globe,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react'
import {
  getSuppressions,
  addSuppression,
  removeSuppression,
  getWorkspaces,
  getUnsubscribers,
  getCampaigns,
} from '@/lib/api'
import type { Suppression, Unsubscriber, Workspace, Campaign } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

type Tab = 'suppressed' | 'unsubscribed'

export default function CompliancePage() {
  const [tab,        setTab]        = useState<Tab>('suppressed')
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [campaigns,  setCampaigns]  = useState<Campaign[]>([])
  const [search,     setSearch]     = useState('')
  const [debSearch,  setDebSearch]  = useState('')
  const [wsFilter,   setWsFilter]   = useState('')
  const [cmpFilter,  setCmpFilter]  = useState('')
  const [page,       setPage]       = useState(1)
  const [pages,      setPages]      = useState(1)
  const [total,      setTotal]      = useState(0)
  const [loading,    setLoading]    = useState(true)
  const [msg,        setMsg]        = useState<{ ok: boolean; text: string } | null>(null)

  // suppressed data
  const [suppressions, setSuppressions] = useState<Suppression[]>([])
  // unsub data
  const [unsubbers,    setUnsubbers]    = useState<Unsubscriber[]>([])

  // add-suppression dialog
  const [addOpen,   setAddOpen]   = useState(false)
  const [addEmail,  setAddEmail]  = useState('')
  const [addWs,     setAddWs]     = useState('')
  const [adding,    setAdding]    = useState(false)
  const [addErr,    setAddErr]    = useState<string | null>(null)

  // confirm-remove dialog
  const [removeTarget, setRemoveTarget] = useState<{ email: string; workspaceId: string } | null>(null)
  const [removing,     setRemoving]     = useState(false)
  const [removeErr,    setRemoveErr]    = useState<string | null>(null)

  // search debounce
  useEffect(() => {
    const t = setTimeout(() => { setDebSearch(search); setPage(1) }, 280)
    return () => clearTimeout(t)
  }, [search])

  // clear tab state on tab switch
  useEffect(() => {
    setSearch(''); setDebSearch(''); setPage(1); setCmpFilter('')
  }, [tab])

  // auto-clear msg
  useEffect(() => {
    if (!msg) return
    const t = setTimeout(() => setMsg(null), 4000)
    return () => clearTimeout(t)
  }, [msg])

  // load workspaces + campaigns once
  useEffect(() => {
    Promise.allSettled([getWorkspaces(), getCampaigns()]).then(([w, c]) => {
      if (w.status === 'fulfilled') {
        setWorkspaces(w.value || [])
        setAddWs(w.value?.[0]?.id || '')
      }
      if (c.status === 'fulfilled') setCampaigns(c.value || [])
    })
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      if (tab === 'suppressed') {
        const res = await getSuppressions(wsFilter || undefined, debSearch || undefined, page, 50)
        setSuppressions(res.data || [])
        setTotal(res.total || 0)
        setPages(res.pages || 1)
      } else {
        const res = await getUnsubscribers(wsFilter || undefined, cmpFilter || undefined, debSearch || undefined, page, 50)
        setUnsubbers(res.data || [])
        setTotal(res.total || 0)
        setPages(res.pages || 1)
      }
    } catch (e: any) {
      setMsg({ ok: false, text: e.message || 'Failed to load' })
    } finally {
      setLoading(false)
    }
  }, [tab, wsFilter, cmpFilter, debSearch, page])

  useEffect(() => { load() }, [load])

  async function addSupp(e: React.FormEvent) {
    e.preventDefault()
    if (!addEmail.trim() || !addWs) return
    setAdding(true); setAddErr(null)
    try {
      await addSuppression(addWs, addEmail.trim())
      setAddEmail(''); setAddOpen(false)
      setMsg({ ok: true, text: `${addEmail.trim()} suppressed.` })
      await load()
    } catch (err: any) {
      setAddErr(err.message || 'Failed')
    } finally { setAdding(false) }
  }

  async function removeEntry() {
    if (!removeTarget) return
    setRemoving(true); setRemoveErr(null)
    try {
      await removeSuppression(removeTarget.workspaceId, removeTarget.email)
      const email = removeTarget.email
      setRemoveTarget(null)
      setMsg({ ok: true, text: `${email} removed — can now receive emails.` })
      await load()
    } catch (err: any) {
      setRemoveErr(err.message || 'Failed')
    } finally { setRemoving(false) }
  }

  return (
    <div className="space-y-5">

      {/* header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">Compliance</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading} className="h-8 text-xs gap-1.5">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {tab === 'suppressed' && (
            <Button size="sm" onClick={() => { setAddOpen(true); setAddErr(null) }} className="h-8 text-xs gap-1.5 shadow-sm">
              <PlusCircle className="h-3.5 w-3.5" />
              Add Suppression
            </Button>
          )}
        </div>
      </div>

      {msg && (
        <div className={`text-sm px-3 py-2 rounded-md border ${
          msg.ok
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-900 dark:text-emerald-300'
            : 'bg-destructive/5 border-destructive/30 text-destructive'
        }`}>
          {msg.text}
        </div>
      )}

      {/* tabs + search bar */}
      <div className="flex items-center justify-between gap-4 border-b border-border">
        <div className="flex items-center">
          {(['suppressed', 'unsubscribed'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors capitalize ${
                tab === t
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {t === 'suppressed' ? 'Suppressed' : 'Unsubscribed'}
              <span className="ml-1.5 text-[11px] tabular-nums text-muted-foreground/70">
                {tab === t ? total : ''}
              </span>
            </button>
          ))}
        </div>
        {/* filters row */}
        <div className="flex items-center gap-2 pb-px">
          <div className="relative">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search email..."
              className="pl-8 h-8 text-xs w-48 bg-background"
            />
          </div>
          {workspaces.length > 1 && (
            <Select value={wsFilter} onValueChange={v => { setWsFilter(v === 'all' ? '' : v); setPage(1) }}>
              <SelectTrigger className="h-8 text-xs w-36"><SelectValue placeholder="Workspace" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Workspaces</SelectItem>
                {workspaces.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          {tab === 'unsubscribed' && campaigns.length > 0 && (
            <Select value={cmpFilter} onValueChange={v => { setCmpFilter(v === 'all' ? '' : v); setPage(1) }}>
              <SelectTrigger className="h-8 text-xs w-40"><SelectValue placeholder="All Campaigns" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Campaigns</SelectItem>
                {campaigns.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* table */}
      <div className="border border-border rounded-lg overflow-hidden">

        {/* ── SUPPRESSED TAB ── */}
        {tab === 'suppressed' && (
          <>
            <div className="grid grid-cols-[1fr_160px_160px_80px] text-[11px] font-semibold uppercase tracking-wider text-muted-foreground bg-muted/30 border-b border-border px-4 py-2.5">
              <div>Email</div>
              <div>Workspace</div>
              <div>Suppressed</div>
              <div className="text-right">Action</div>
            </div>
            {loading ? (
              <div className="divide-y divide-border">
                {[1,2,3].map(i => (
                  <div key={i} className="grid grid-cols-[1fr_160px_160px_80px] px-4 py-3 items-center">
                    <Skeleton className="h-4 w-52" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-4 w-16 ml-auto" />
                  </div>
                ))}
              </div>
            ) : suppressions.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <p className="text-sm text-muted-foreground">
                  {debSearch ? `No matches for "${debSearch}".` : 'No suppressed emails.'}
                </p>
                {debSearch && (
                  <button onClick={() => setSearch('')} className="mt-2 text-xs text-primary hover:underline">
                    Clear search
                  </button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-border">
                {suppressions.map(item => (
                  <div key={item.id} className="grid grid-cols-[1fr_160px_160px_80px] px-4 py-3 items-center hover:bg-muted/20 transition-colors group">
                    <div className="font-mono text-[13px] font-medium truncate pr-4">{item.email}</div>
                    <div className="text-[12px] text-muted-foreground">{item.workspace?.name || item.workspaceId}</div>
                    <div className="text-[12px] text-muted-foreground font-mono">
                      {new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                    <div className="text-right">
                      <button
                        onClick={() => { setRemoveTarget({ email: item.email, workspaceId: item.workspaceId }); setRemoveErr(null) }}
                        className="text-[11px] font-medium text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── UNSUBSCRIBED TAB ── */}
        {tab === 'unsubscribed' && (
          <>
            <div className="grid grid-cols-[1fr_160px_80px_140px_80px] text-[11px] font-semibold uppercase tracking-wider text-muted-foreground bg-muted/30 border-b border-border px-4 py-2.5">
              <div>Prospect</div>
              <div>Campaign</div>
              <div>Location</div>
              <div>Unsubscribed</div>
              <div className="text-right">Action</div>
            </div>
            {loading ? (
              <div className="divide-y divide-border">
                {[1,2,3].map(i => (
                  <div key={i} className="grid grid-cols-[1fr_160px_80px_140px_80px] px-4 py-3 items-center">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-4 w-16 ml-auto" />
                  </div>
                ))}
              </div>
            ) : unsubbers.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <p className="text-sm text-muted-foreground">
                  {debSearch || cmpFilter ? 'No matches.' : 'No unsubscribers yet.'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {unsubbers.map(item => (
                  <div key={item.id} className="grid grid-cols-[1fr_160px_80px_140px_80px] px-4 py-3 items-center hover:bg-muted/20 transition-colors group">
                    <div className="min-w-0 pr-4">
                      <div className="font-mono text-[13px] font-medium truncate">{item.email}</div>
                      {item.name && <div className="text-[11px] text-muted-foreground">{item.name}</div>}
                    </div>
                    <div>
                      <Link href={`/campaigns/${item.campaignId}`}
                        className="text-[12px] text-primary hover:underline flex items-center gap-0.5 w-fit">
                        <span className="truncate max-w-[140px]">{item.campaignName}</span>
                        <ExternalLink className="h-2.5 w-2.5 shrink-0" />
                      </Link>
                    </div>
                    <div className="text-[12px] text-muted-foreground">
                      {item.country ? (
                        <span className="flex items-center gap-1">
                          <Globe className="h-3 w-3" />{item.country}
                        </span>
                      ) : '—'}
                    </div>
                    <div className="text-[12px] text-muted-foreground font-mono">
                      {new Date(item.unsubscribedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                    <div className="text-right">
                      <button
                        onClick={() => {
                          setRemoveTarget({ email: item.email, workspaceId: item.workspaceId || workspaces[0]?.id || '' })
                          setRemoveErr(null)
                        }}
                        className="text-[11px] font-medium text-muted-foreground hover:text-primary transition-colors opacity-0 group-hover:opacity-100"
                      >
                        Resubscribe
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <span className="text-[12px] text-muted-foreground">
              {(page - 1) * 50 + 1}–{Math.min(page * 50, total)} of {total}
            </span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1 || loading}
                onClick={() => setPage(p => Math.max(1, p - 1))} className="h-7 text-xs">
                <ChevronLeft className="h-3.5 w-3.5 mr-1" />Prev
              </Button>
              <span className="text-[12px] font-mono text-muted-foreground">{page}/{pages}</span>
              <Button variant="outline" size="sm" disabled={page >= pages || loading}
                onClick={() => setPage(p => Math.min(pages, p + 1))} className="h-7 text-xs">
                Next<ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Add suppression dialog */}
      <Dialog open={addOpen} onOpenChange={o => { if (!o) { setAddOpen(false); setAddErr(null) } }}>
        <DialogContent className="max-w-sm">
          <form onSubmit={addSupp}>
            <DialogHeader>
              <DialogTitle>Add Suppression</DialogTitle>
              <DialogDescription className="text-sm">
                This email will be permanently blocked from receiving campaign emails.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-4">
              {addErr && <p className="text-xs text-destructive">{addErr}</p>}
              <div className="space-y-1.5">
                <Label htmlFor="add-email" className="text-xs">Email address</Label>
                <Input id="add-email" type="email" value={addEmail}
                  onChange={e => setAddEmail(e.target.value)} required
                  placeholder="contact@example.com" className="h-8 text-sm" />
              </div>
              {workspaces.length > 1 && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Workspace</Label>
                  <Select value={addWs} onValueChange={setAddWs}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {workspaces.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setAddOpen(false)} disabled={adding}>Cancel</Button>
              <Button type="submit" size="sm" disabled={adding || !addEmail.trim()}>
                {adding ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <ShieldAlert className="h-3.5 w-3.5 mr-1.5" />}
                Suppress
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Remove / resubscribe confirm dialog */}
      <Dialog open={!!removeTarget} onOpenChange={o => { if (!o) { setRemoveTarget(null); setRemoveErr(null) } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{tab === 'suppressed' ? 'Remove suppression?' : 'Resubscribe contact?'}</DialogTitle>
            <DialogDescription className="text-sm">
              <strong>{removeTarget?.email}</strong> will become eligible to receive campaign emails again.
            </DialogDescription>
          </DialogHeader>
          {removeErr && <p className="text-xs text-destructive">{removeErr}</p>}
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setRemoveTarget(null)} disabled={removing}>Cancel</Button>
            <Button size="sm" onClick={removeEntry} disabled={removing}>
              {removing ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Trash2 className="h-3.5 w-3.5 mr-1.5" />}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}

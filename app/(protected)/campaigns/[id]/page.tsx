'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  RefreshCw,
  Play,
  Pause,
  XCircle,
  AlertCircle,
  Mail,
  Eye,
  MousePointerClick,
  MessageSquareReply,
  UserX,
  Activity,
  Globe,
  ExternalLink,
  Edit3,
  Save,
  Clock,
  Inbox,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import {
  getCampaign,
  getAnalytics,
  computeAnalytics,
  sendCampaign,
  pauseCampaign,
  resumeCampaign,
  cancelCampaign,
  updateCampaign,
  generateMessages,
  getSequenceProgress,
  markLeadReplied,
  getCampaignActivity,
  syncImapInboxes,
} from '@/lib/api'
import type { Campaign, AnalyticsSnapshot, SequenceProgress, ActivityEvent } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { formatRate } from '@/lib/utils'

// ── tiny helpers ──────────────────────────────────────────
function Metric({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="space-y-0.5">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`text-xl font-bold font-mono tabular-nums ${color || 'text-foreground'}`}>{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground">{sub}</div>}
    </div>
  )
}

// ── page ──────────────────────────────────────────────────
export default function CampaignDetailPage() {
  const { id } = useParams() as { id: string }

  const [campaign,  setCampaign]  = useState<Campaign | null>(null)
  const [analytics, setAnalytics] = useState<AnalyticsSnapshot | null>(null)
  const [seq,       setSeq]       = useState<SequenceProgress | null>(null)
  const [activity,  setActivity]  = useState<ActivityEvent[]>([])
  const [loading,   setLoading]   = useState(true)
  const [busy,      setBusy]      = useState(false)
  const [msg,       setMsg]       = useState<{ ok: boolean; text: string } | null>(null)
  const [syncBusy,  setSyncBusy]  = useState(false)

  // Edit follow-ups state
  const [editOpen,    setEditOpen]    = useState(false)
  const [editSteps,   setEditSteps]   = useState<any[]>([])
  const [editSubject, setEditSubject] = useState('')
  const [editOpens,   setEditOpens]   = useState(true)
  const [editClicks,  setEditClicks]  = useState(true)
  const [saving,      setSaving]      = useState(false)

  // overflow menu
  const [moreOpen, setMoreOpen] = useState(false)

  const load = useCallback(async () => {
    try {
      const [c, a, s, act] = await Promise.allSettled([
        getCampaign(id),
        getAnalytics(id),
        getSequenceProgress(id),
        getCampaignActivity(id),
      ])
      const cData = c.status === 'fulfilled' ? c.value : null
      const aData = a.status === 'fulfilled' ? a.value : null
      const sData = s.status === 'fulfilled' ? s.value : null
      const actData = act.status === 'fulfilled' ? act.value : []

      if (cData) setCampaign(cData)
      if (aData) setAnalytics(aData)
      if (sData) setSeq(sData)
      if (actData) setActivity(actData)

      if (cData && (cData.status === 'COMPLETED' || cData.status === 'SENDING') &&
        (!aData || aData.staleWarning || aData.sent === 0 || !aData.computedAt)) {
        computeAnalytics(id).then(f => setAnalytics(f)).catch(() => null)
      }
    } catch {}
    finally { setLoading(false) }
  }, [id])

  useEffect(() => { load() }, [load])

  async function action(name: 'send' | 'pause' | 'resume' | 'cancel') {
    setBusy(true); setMsg(null)
    try {
      if (name === 'send') {
        await generateMessages(id).catch(() => null)
        await sendCampaign(id)
        setMsg({ ok: true, text: 'Campaign dispatching — emails queued in background.' })
      } else if (name === 'pause') {
        await pauseCampaign(id)
        setMsg({ ok: true, text: 'Paused.' })
      } else if (name === 'resume') {
        await resumeCampaign(id)
        setMsg({ ok: true, text: 'Resumed.' })
      } else if (name === 'cancel') {
        if (!confirm('Cancel this campaign? This cannot be undone.')) return
        await cancelCampaign(id)
        setMsg({ ok: true, text: 'Cancelled.' })
      }
      await load()
    } catch (e: any) {
      setMsg({ ok: false, text: e.message || 'Failed' })
    } finally { setBusy(false) }
  }

  async function refreshAnalytics() {
    setBusy(true); setMsg(null)
    try {
      const f = await computeAnalytics(id)
      setAnalytics(f)
      const a = await getCampaignActivity(id).catch(() => [])
      setActivity(a)
      setMsg({ ok: true, text: 'Analytics refreshed.' })
    } catch (e: any) {
      setMsg({ ok: false, text: e.message || 'Failed' })
    } finally { setBusy(false) }
  }

  async function syncInbox() {
    setSyncBusy(true); setMsg(null)
    try {
      const r = await syncImapInboxes()
      if (r.status === 'no_accounts_configured') {
        setMsg({ ok: false, text: 'No IMAP accounts configured.' })
      } else {
        setMsg({ ok: true, text: `Synced — scanned ${r.totalEmailsScanned} emails, matched ${r.matchedReplies} reply(ies).` })
      }
      await load()
    } catch (e: any) {
      setMsg({ ok: false, text: e.message || 'Sync failed' })
    } finally { setSyncBusy(false) }
  }

  async function markReplied(leadId: string) {
    setBusy(true)
    try {
      await markLeadReplied(id, leadId)
      await load()
    } catch (e: any) {
      setMsg({ ok: false, text: e.message || 'Failed' })
    } finally { setBusy(false) }
  }

  function openEdit() {
    if (!campaign) return
    const steps = campaign.steps?.length
      ? campaign.steps.map((s, i) => ({
          stepOrder: s.stepOrder || i + 1,
          delayHours: s.delayHours ?? (i === 0 ? 0 : 48),
          sendAsReply: s.sendAsReply ?? i > 0,
          subject: s.subject || '',
          htmlBody: s.htmlBody || '',
        }))
      : [
          { stepOrder: 1, delayHours: 0, sendAsReply: false, subject: campaign.subject || '', htmlBody: campaign.htmlBody || '' },
          { stepOrder: 2, delayHours: 48, sendAsReply: true, subject: '', htmlBody: '' },
        ]
    setEditSteps(steps)
    setEditSubject(campaign.subject || '')
    setEditOpens(campaign.trackOpens ?? true)
    setEditClicks(campaign.trackClicks ?? true)
    setEditOpen(true)
    setMoreOpen(false)
  }

  async function saveEdit() {
    if (!campaign) return
    setSaving(true)
    try {
      await updateCampaign(campaign.id, {
        subject: editSubject.trim() || undefined,
        trackOpens: editOpens,
        trackClicks: editClicks,
        steps: editSteps.map((s, i) => ({
          ...s,
          stepOrder: i + 1,
          subject: i === 0 ? (s.subject || editSubject).trim() : s.subject?.trim(),
        })),
      })
      setMsg({ ok: true, text: 'Sequence updated. Pending follow-ups will use new settings.' })
      setEditOpen(false)
      await load()
    } catch (e: any) {
      setMsg({ ok: false, text: e.message || 'Failed to save' })
    } finally { setSaving(false) }
  }

  // ── derived numbers ──
  const sent       = analytics?.sent        || 0
  const delivered  = analytics?.delivered   || 0
  const opened     = analytics?.opened      || 0
  const clicked    = analytics?.clicked     || 0
  const replied    = analytics?.replied     || 0
  const unsub      = analytics?.unsubscribed || 0
  const bounced    = analytics?.bounced     || 0
  const complained = analytics?.complained  || 0
  const totalOpens = analytics?.totalOpens  || 0
  const totalClicks = analytics?.totalClicks || 0

  const deliveryRate = sent > 0 ? delivered / sent : 0
  const openRate     = (delivered > 0 ? opened / delivered : (sent > 0 ? opened / sent : 0))
  const clickRate    = (delivered > 0 ? clicked / delivered : (sent > 0 ? clicked / sent : 0))
  const ctor         = opened > 0 ? clicked / opened : 0
  const replyRate    = (delivered > 0 ? replied / delivered : (sent > 0 ? replied / sent : 0))
  const bounceRate   = sent > 0 ? bounced / sent : 0

  const isFinished = !!(seq && seq.totalLeads > 0 &&
    (seq.statusCounts.ACTIVE || 0) === 0 &&
    (seq.statusCounts.WAITING_DELAY || 0) === 0)
  const status = isFinished ? 'COMPLETED' : (campaign?.status || '')
  const isSeq  = !!(campaign?.isSequence || campaign?.steps?.length)

  // ── status dot ──
  function StatusText() {
    if (status === 'SENDING') return (
      <span className="flex items-center gap-1.5 text-sm font-medium text-blue-600">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-500 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
        </span>
        Live
      </span>
    )
    if (status === 'COMPLETED') return <span className="flex items-center gap-1.5 text-sm text-muted-foreground"><span className="h-2 w-2 rounded-full bg-emerald-500" />Completed</span>
    if (status === 'PAUSED')    return <span className="flex items-center gap-1.5 text-sm text-muted-foreground"><span className="h-2 w-2 rounded-full bg-amber-500" />Paused</span>
    if (status === 'CANCELLED') return <span className="flex items-center gap-1.5 text-sm text-muted-foreground"><span className="h-2 w-2 rounded-full bg-red-400" />Cancelled</span>
    return <span className="text-sm text-muted-foreground">Draft</span>
  }

  // ── loading ──
  if (loading) return (
    <div className="space-y-5">
      <Skeleton className="h-6 w-56" />
      <Skeleton className="h-16 w-full rounded-lg" />
      <Skeleton className="h-28 w-full rounded-lg" />
    </div>
  )

  if (!campaign) return (
    <div className="text-center py-16">
      <AlertCircle className="mx-auto h-8 w-8 text-muted-foreground mb-3" />
      <p className="text-sm text-muted-foreground">Campaign not found.</p>
      <Link href="/campaigns" className="text-sm font-medium text-primary hover:underline mt-2 inline-block">← Back to Campaigns</Link>
    </div>
  )

  // ── render ────────────────────────────────────────────────
  return (
    <div className="space-y-6 pb-16">

      {/* ── header bar ── */}
      <div className="flex items-start gap-3">
        <Link href="/campaigns" className="mt-1 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-semibold tracking-tight truncate">{campaign.name}</h1>
            <StatusText />
          </div>
          <div className="flex items-center gap-2 text-[12px] text-muted-foreground mt-0.5 flex-wrap">
            {campaign.subject && <span className="truncate max-w-[300px]">{campaign.subject}</span>}
            {campaign.fromEmail && <><span>·</span><span>from {campaign.fromEmail}</span></>}
            <span>·</span>
            <Link href={`/audiences/${campaign.audienceId}`} className="hover:text-primary transition-colors flex items-center gap-0.5">
              Audience <ExternalLink className="h-2.5 w-2.5 ml-0.5" />
            </Link>
          </div>
        </div>

        {/* ── action buttons ── */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
          {status === 'DRAFT' && (
            <>
              <Button asChild variant="outline" size="sm" className="h-8 text-xs">
                <Link href={`/campaigns/${id}/edit`}><Edit3 className="h-3.5 w-3.5 mr-1.5" />Edit</Link>
              </Button>
              <Button size="sm" disabled={busy} onClick={() => action('send')}
                className="h-8 text-xs shadow-sm">
                <Play className="h-3.5 w-3.5 mr-1.5 fill-current" />Start Send
              </Button>
            </>
          )}
          {status === 'SENDING' && (
            <>
              <Button variant="outline" size="sm" disabled={busy} onClick={() => action('pause')} className="h-8 text-xs">
                <Pause className="h-3.5 w-3.5 mr-1.5" />Pause
              </Button>
              <button onClick={() => action('cancel')} disabled={busy}
                className="text-xs text-destructive hover:underline font-medium px-2">
                Cancel
              </button>
            </>
          )}
          {status === 'PAUSED' && (
            <Button size="sm" disabled={busy} onClick={() => action('resume')} className="h-8 text-xs shadow-sm">
              <Play className="h-3.5 w-3.5 mr-1.5 fill-current" />Resume
            </Button>
          )}
          {status === 'COMPLETED' && (seq?.statusCounts?.ACTIVE || 0) > 0 && (
            <Button size="sm" disabled={busy} onClick={() => action('send')} className="h-8 text-xs shadow-sm">
              <Play className="h-3.5 w-3.5 mr-1.5 fill-current" />Dispatch Active Leads
            </Button>
          )}

          {/* ··· overflow menu */}
          <div className="relative">
            <Button variant="outline" size="sm" onClick={() => setMoreOpen(p => !p)} className="h-8 w-8 p-0 text-xs">
              ···
            </Button>
            {moreOpen && (
              <div className="absolute right-0 mt-1 w-44 bg-background border border-border rounded-md shadow-md py-1 z-20">
                {isSeq && (
                  <button onClick={openEdit}
                    className="w-full text-left px-3 py-1.5 text-sm hover:bg-muted/60 flex items-center gap-2">
                    <Edit3 className="h-3.5 w-3.5 text-muted-foreground" />Edit Follow-ups
                  </button>
                )}
                <button onClick={() => { setMoreOpen(false); syncInbox() }}
                  className="w-full text-left px-3 py-1.5 text-sm hover:bg-muted/60 flex items-center gap-2">
                  <Inbox className={`h-3.5 w-3.5 text-muted-foreground ${syncBusy ? 'animate-spin' : ''}`} />
                  {syncBusy ? 'Syncing...' : 'Sync Inbox Replies'}
                </button>
                <Link href="/inbox"
                  className="block px-3 py-1.5 text-sm hover:bg-muted/60 flex items-center gap-2">
                  <Inbox className="h-3.5 w-3.5 text-muted-foreground" />Open Inbox
                </Link>
                <button onClick={() => { setMoreOpen(false); refreshAnalytics() }}
                  className="w-full text-left px-3 py-1.5 text-sm hover:bg-muted/60 flex items-center gap-2">
                  <RefreshCw className={`h-3.5 w-3.5 text-muted-foreground ${busy ? 'animate-spin' : ''}`} />
                  Refresh Analytics
                </button>
                {status !== 'DRAFT' && (
                  <Link href={`/campaigns/${id}/edit`}
                    className="block px-3 py-1.5 text-sm hover:bg-muted/60 flex items-center gap-2">
                    <Edit3 className="h-3.5 w-3.5 text-muted-foreground" />Edit Campaign
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── status message ── */}
      {msg && (
        <div className={`text-sm px-3 py-2 rounded-md border ${
          msg.ok
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-900 dark:text-emerald-300'
            : 'bg-destructive/5 border-destructive/30 text-destructive'
        }`}>
          {msg.text}
        </div>
      )}

      {/* ── draft banner ── */}
      {status === 'DRAFT' && (
        <div className="border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-900 rounded-lg p-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-amber-900 dark:text-amber-200">This campaign is a draft</p>
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">Edit the audience, copy, or sequence before launching.</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button asChild variant="outline" size="sm" className="h-8 text-xs border-amber-300 text-amber-800 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-300">
              <Link href={`/campaigns/${id}/edit`}>Edit</Link>
            </Button>
            <Button size="sm" disabled={busy} onClick={() => action('send')} className="h-8 text-xs shadow-sm">
              <Play className="h-3.5 w-3.5 mr-1.5 fill-current" />Send Now
            </Button>
          </div>
        </div>
      )}

      {/* ── metrics row ── */}
      <div className="border border-border rounded-lg overflow-hidden">
        {/* header */}
        <div className="px-5 py-3 border-b border-border bg-muted/30 flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Performance</span>
          {analytics?.computedAt && new Date(analytics.computedAt).getFullYear() > 2020 && (
            <span className="text-[11px] font-mono text-muted-foreground">
              updated {new Date(analytics.computedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
        {/* metric grid */}
        <div className="grid grid-cols-3 sm:grid-cols-6 divide-x divide-border">
          <div className="p-4"><Metric label="Sent"      value={sent.toLocaleString()} /></div>
          <div className="p-4"><Metric label="Delivered" value={delivered.toLocaleString()} sub={formatRate(deliveryRate)} color="text-emerald-600" /></div>
          <div className="p-4"><Metric label="Opened"    value={opened.toLocaleString()}   sub={`${formatRate(openRate)} · ${totalOpens} tot`} color="text-sky-600" /></div>
          <div className="p-4"><Metric label="Clicked"   value={clicked.toLocaleString()}  sub={`${formatRate(clickRate)} · ${totalClicks} tot`} color="text-indigo-600" /></div>
          <div className="p-4"><Metric label="Replied"   value={replied > 0 ? replied.toLocaleString() : '—'} sub={replied > 0 ? formatRate(replyRate) : undefined} color="text-violet-600" /></div>
          <div className="p-4"><Metric label="Bounces"   value={bounced > 0 ? bounced.toLocaleString() : '—'} sub={bounced > 0 ? formatRate(bounceRate) : undefined} color={bounceRate > 0.05 ? 'text-destructive' : 'text-muted-foreground'} /></div>
        </div>
        {/* secondary row */}
        {(unsub > 0 || complained > 0) && (
          <div className="border-t border-border px-5 py-2.5 flex items-center gap-6 text-[12px] text-muted-foreground">
            {unsub > 0 && <span><strong className="text-foreground">{unsub}</strong> unsubscribed</span>}
            {complained > 0 && <span><strong className="text-destructive">{complained}</strong> spam complaint{complained !== 1 ? 's' : ''}</span>}
            {ctor > 0 && <span><strong className="text-foreground">{formatRate(ctor)}</strong> CTOR</span>}
          </div>
        )}
      </div>

      {/* ── sequence timeline ── */}
      {seq && seq.steps.length > 0 && (
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">Sequence Steps</div>
          <div className="border border-border rounded-lg overflow-hidden">
            {seq.steps.map((step, idx) => {
              const isFinal = idx === seq.steps.length - 1
              const stepSent = step.sentAtStep || 0
              const stepOpenRate = stepSent > 0 && step.opensAtStep ? step.opensAtStep / stepSent : null
              const stepReplyRate = stepSent > 0 && step.repliesAtStep ? step.repliesAtStep / stepSent : null
              const delayDays = Math.round((step.delayHours || 0) / 24)
              return (
                <div key={step.stepOrder}>
                  {/* step row */}
                  <div className="flex items-start gap-4 px-4 py-3 hover:bg-muted/20 transition-colors">
                    {/* timeline indicator */}
                    <div className="flex flex-col items-center shrink-0 mt-1">
                      <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center text-[11px] font-bold ${
                        stepSent > 0 ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-muted-foreground bg-background'
                      }`}>
                        {step.stepOrder}
                      </div>
                      {!isFinal && <div className="w-0.5 bg-border flex-1 mt-1" style={{ minHeight: 20 }} />}
                    </div>
                    {/* step info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-4 flex-wrap">
                        <div>
                          <span className="text-sm font-medium">
                            {idx === 0 ? 'Initial email' : `Follow-up #${idx}`}
                          </span>
                          {idx === 0 ? (
                            <span className="ml-2 text-[11px] text-muted-foreground">sent at launch</span>
                          ) : (
                            <span className="ml-2 text-[11px] text-muted-foreground">
                              +{delayDays}d
                            </span>
                          )}
                          {step.sendAsReply && idx > 0 && (
                            <span className="ml-2 text-[11px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">threaded</span>
                          )}
                        </div>
                        {stepSent > 0 && (
                          <div className="flex items-center gap-3 text-[12px] font-mono text-muted-foreground">
                            <span><strong className="text-foreground">{stepSent.toLocaleString()}</strong> sent</span>
                            {stepOpenRate !== null && (
                              <span><strong className={stepOpenRate > 0.3 ? 'text-emerald-600' : 'text-foreground'}>{formatRate(stepOpenRate)}</strong> open</span>
                            )}
                            {stepReplyRate !== null && (
                              <span><strong className="text-violet-600">{formatRate(stepReplyRate)}</strong> reply</span>
                            )}
                          </div>
                        )}
                        {stepSent === 0 && (
                          <span className="text-[12px] text-muted-foreground">
                            {(seq.statusCounts.WAITING_DELAY || 0) > 0 ? `${seq.statusCounts.WAITING_DELAY} leads waiting` : 'pending'}
                          </span>
                        )}
                      </div>
                      {/* subject */}
                      {(step as any).subject && (
                        <div className="text-[12px] text-muted-foreground truncate mt-0.5">
                          "{(step as any).subject}"
                        </div>
                      )}
                    </div>
                  </div>
                  {/* delay connector */}
                  {!isFinal && (
                    <div className="flex items-center gap-2 px-4 py-1.5 border-t border-b border-border/50 bg-muted/20">
                      <div className="ml-[11px] text-[11px] text-muted-foreground flex items-center gap-1.5">
                        <Clock className="h-3 w-3" />
                        Wait {delayDays > 0 ? `${delayDays} day${delayDays !== 1 ? 's' : ''}` : `${seq.steps[idx + 1]?.delayHours || 48}h`} then send Step {step.stepOrder + 1}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── active leads ── */}
      {seq && seq.leads.length > 0 && (
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Active Prospects
            <span className="ml-2 font-normal text-muted-foreground/70 normal-case">{seq.leads.length} leads</span>
          </div>
          <div className="border border-border rounded-lg overflow-hidden">
            <div className="grid grid-cols-[1fr_60px_100px_120px_120px_80px] text-[11px] font-semibold uppercase tracking-wider text-muted-foreground bg-muted/30 border-b border-border px-4 py-2.5">
              <div>Recipient</div>
              <div>Step</div>
              <div>Status</div>
              <div>Last Sent</div>
              <div>Next Send</div>
              <div className="text-right">Action</div>
            </div>
            <div className="divide-y divide-border">
              {seq.leads.map(lead => {
                const statusColor: Record<string, string> = {
                  REPLIED: 'text-violet-600',
                  COMPLETED: 'text-emerald-600',
                  WAITING_DELAY: 'text-blue-600',
                  UNSUBSCRIBED: 'text-amber-600',
                  BOUNCED: 'text-destructive',
                }
                return (
                  <div key={lead.id} className="grid grid-cols-[1fr_60px_100px_120px_120px_80px] px-4 py-2.5 text-[12px] hover:bg-muted/20 transition-colors items-center">
                    <div className="font-medium truncate pr-3">
                      {lead.name !== '—' ? `${lead.name}` : lead.email}
                      <span className="text-muted-foreground ml-1 font-normal hidden sm:inline">{lead.email}</span>
                    </div>
                    <div className="font-mono text-muted-foreground">{lead.currentStep}/{seq.steps.length}</div>
                    <div className={`font-medium ${statusColor[lead.status] || 'text-muted-foreground'}`}>
                      {lead.status.replace('_', ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())}
                    </div>
                    <div className="text-muted-foreground font-mono text-[11px]">
                      {lead.lastSentAt ? new Date(lead.lastSentAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                    </div>
                    <div className="text-muted-foreground font-mono text-[11px]">
                      {lead.nextSendAt ? new Date(lead.nextSendAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                    </div>
                    <div className="text-right">
                      {lead.status !== 'REPLIED' && lead.status !== 'UNSUBSCRIBED' && lead.status !== 'BOUNCED' && lead.status !== 'COMPLETED' ? (
                        <button
                          onClick={() => markReplied(lead.id)}
                          disabled={busy}
                          className="text-[11px] font-medium text-violet-600 hover:underline"
                          title="Mark as replied — stops sequence"
                        >
                          Mark replied
                        </button>
                      ) : lead.status === 'REPLIED' ? (
                        <span className="text-[11px] text-violet-600">Halted</span>
                      ) : null}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── activity feed ── */}
      {activity.length > 0 && (
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Engagement Events
            <span className="ml-2 font-normal text-muted-foreground/70 normal-case">{activity.length} logged</span>
          </div>
          <div className="border border-border rounded-lg overflow-hidden divide-y divide-border">
            {activity.slice(0, 20).map(evt => {
              const color: Record<string, string> = {
                Open:        'text-sky-600',
                Click:       'text-indigo-600',
                Reply:       'text-violet-600',
                Unsubscribe: 'text-amber-600',
              }
              const Icon: Record<string, any> = {
                Open:  Eye,
                Click: MousePointerClick,
                Reply: MessageSquareReply,
                Unsubscribe: UserX,
              }
              const I = Icon[evt.type] || Activity
              return (
                <div key={evt.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-muted/20 text-[12px] transition-colors">
                  <div className="flex items-center gap-3">
                    <I className={`h-3.5 w-3.5 shrink-0 ${color[evt.type] || 'text-muted-foreground'}`} />
                    <span className="font-medium text-foreground">
                      {evt.contactName ? `${evt.contactName}` : evt.contactEmail}
                    </span>
                    <span className="text-muted-foreground">
                      {evt.type === 'Open' && 'opened'}
                      {evt.type === 'Click' && 'clicked'}
                      {evt.type === 'Reply' && 'replied'}
                      {evt.type === 'Unsubscribe' && 'unsubscribed'}
                      {!['Open','Click','Reply','Unsubscribe'].includes(evt.type) && evt.type.toLowerCase()}
                      {evt.stepNumber ? ` · Step ${evt.stepNumber}` : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-muted-foreground text-[11px] font-mono">
                    {evt.country && (
                      <span className="flex items-center gap-1">
                        <Globe className="h-2.5 w-2.5" />{evt.country}
                      </span>
                    )}
                    <span>{new Date(evt.occurredAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── edit sequence modal ── */}
      {editOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setEditOpen(false)}>
          <div className="bg-background border border-border rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h2 className="text-base font-semibold">Edit Follow-ups</h2>
              <button onClick={() => setEditOpen(false)} className="text-muted-foreground hover:text-foreground text-lg leading-none p-1">✕</button>
            </div>
            <div className="p-5 overflow-y-auto space-y-5 flex-1">
              <p className="text-[12px] text-muted-foreground border border-border rounded-md px-3 py-2 bg-muted/30">
                Changes apply to future/pending follow-ups only. Already-delivered emails are not modified.
              </p>
              {/* tracking */}
              <div className="space-y-2">
                <label className="flex items-center justify-between text-sm cursor-pointer">
                  <div>
                    <div className="font-medium">Track opens</div>
                    <div className="text-[11px] text-muted-foreground">Inserts a 1×1 tracking pixel. Disable for better cold deliverability.</div>
                  </div>
                  <input type="checkbox" checked={editOpens} onChange={e => setEditOpens(e.target.checked)} className="h-4 w-4 rounded" />
                </label>
                <label className="flex items-center justify-between text-sm cursor-pointer">
                  <div>
                    <div className="font-medium">Track clicks</div>
                    <div className="text-[11px] text-muted-foreground">Rewrites links through tracking redirect. Disable for raw links.</div>
                  </div>
                  <input type="checkbox" checked={editClicks} onChange={e => setEditClicks(e.target.checked)} className="h-4 w-4 rounded" />
                </label>
              </div>
              {/* steps */}
              <div className="space-y-4">
                {editSteps.map((step, idx) => (
                  <div key={idx} className="border border-border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {idx === 0 ? 'Step 1 — Initial Email' : `Step ${idx + 1} — Follow-up #${idx}`}
                      </span>
                      {idx > 0 && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Clock className="h-3.5 w-3.5" />
                          Delay:
                          <input
                            type="number" min={1} value={step.delayHours}
                            onChange={e => setEditSteps(p => p.map((s, i) => i === idx ? { ...s, delayHours: parseInt(e.target.value) || 0 } : s))}
                            className="w-16 h-7 text-xs border border-border rounded px-2 bg-background font-mono"
                          />
                          hours
                        </div>
                      )}
                    </div>
                    {idx === 0 ? (
                      <div>
                        <label className="text-xs font-medium mb-1 block">Subject</label>
                        <input type="text" value={step.subject || editSubject}
                          onChange={e => { setEditSubject(e.target.value); setEditSteps(p => p.map((s, i) => i === 0 ? { ...s, subject: e.target.value } : s)) }}
                          className="w-full h-8 text-xs border border-border rounded px-3 bg-background"
                          placeholder="Email subject..." />
                      </div>
                    ) : (
                      <label className="flex items-center gap-2 text-xs cursor-pointer">
                        <input type="checkbox" checked={step.sendAsReply ?? true}
                          onChange={e => setEditSteps(p => p.map((s, i) => i === idx ? { ...s, sendAsReply: e.target.checked } : s))}
                          className="h-3.5 w-3.5 rounded" />
                        Send as threaded reply (Re: {editSubject || 'initial subject'})
                      </label>
                    )}
                    <div>
                      <label className="text-xs font-medium mb-1 block">Email body</label>
                      <textarea rows={5} value={step.htmlBody || ''}
                        onChange={e => setEditSteps(p => p.map((s, i) => i === idx ? { ...s, htmlBody: e.target.value } : s))}
                        className="w-full text-xs border border-border rounded-md p-3 font-mono bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                        placeholder={`Step ${idx + 1} body... use {{first_name}}, {{company_name}}`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="px-5 py-3.5 border-t border-border flex items-center justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditOpen(false)} disabled={saving}>Cancel</Button>
              <Button size="sm" onClick={saveEdit} disabled={saving} className="shadow-sm">
                {saving ? <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { 
  Send, 
  ArrowLeft, 
  RefreshCw, 
  Play, 
  Pause, 
  XCircle, 
  AlertCircle, 
  CheckCircle2, 
  Mail, 
  Eye, 
  MousePointerClick, 
  ShieldAlert, 
  MessageSquareReply,
  Percent,
  UserX,
  Activity,
  Layers,
  Globe,
  ExternalLink
} from 'lucide-react'
import { 
  getCampaign, 
  getAnalytics, 
  computeAnalytics, 
  sendCampaign, 
  pauseCampaign, 
  resumeCampaign, 
  cancelCampaign, 
  generateMessages,
  getSequenceProgress,
  markLeadReplied,
  getCampaignActivity
} from '@/lib/api'

import type { Campaign, AnalyticsSnapshot, SequenceProgress, ActivityEvent } from '@/lib/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { formatRate } from '@/lib/utils'

export default function CampaignDetailPage() {
  const { id } = useParams() as { id: string }

  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [analytics, setAnalytics] = useState<AnalyticsSnapshot | null>(null)
  const [sequenceProgress, setSequenceProgress] = useState<SequenceProgress | null>(null)
  const [activityEvents, setActivityEvents] = useState<ActivityEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const loadData = useCallback(async () => {
    try {
      const [cRes, aRes, sRes, actRes] = await Promise.allSettled([
        getCampaign(id),
        getAnalytics(id),
        getSequenceProgress(id),
        getCampaignActivity(id),
      ])
      const cData = cRes.status === 'fulfilled' ? cRes.value : null
      const aData = aRes.status === 'fulfilled' ? aRes.value : null
      const sData = sRes.status === 'fulfilled' ? sRes.value : null
      const actData = actRes.status === 'fulfilled' ? actRes.value : []

      if (cData) setCampaign(cData)
      if (aData) setAnalytics(aData)
      if (sData) setSequenceProgress(sData)
      if (actData) setActivityEvents(actData)

      // Auto-compute fresh analytics if snapshot is missing, stale, or has 0 sent while completed
      if (
        cData &&
        (cData.status === 'COMPLETED' || cData.status === 'SENDING') &&
        (!aData || aData.staleWarning || aData.sent === 0 || !aData.computedAt)
      ) {
        computeAnalytics(id)
          .then((fresh) => setAnalytics(fresh))
          .catch(() => null)
      }
    } catch (err: any) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    loadData()
  }, [loadData])

  async function handleAction(actionName: 'send' | 'pause' | 'resume' | 'cancel' | 'generate') {
    setActionLoading(true)
    setActionMessage(null)
    try {
      if (actionName === 'send') {
        await generateMessages(id).catch(() => null)
        await sendCampaign(id)
        setActionMessage({ type: 'success', text: 'Campaign dispatch started! Emails are sending in background.' })
      } else if (actionName === 'pause') {
        await pauseCampaign(id)
        setActionMessage({ type: 'success', text: 'Campaign sending paused.' })
      } else if (actionName === 'resume') {
        await resumeCampaign(id)
        setActionMessage({ type: 'success', text: 'Campaign sending resumed.' })
      } else if (actionName === 'cancel') {
        if (!confirm('Are you sure you want to cancel this campaign?')) {
          setActionLoading(false)
          return
        }
        await cancelCampaign(id)
        setActionMessage({ type: 'success', text: 'Campaign cancelled.' })
      } else if (actionName === 'generate') {
        const res = await generateMessages(id)
        setActionMessage({ type: 'success', text: `Generated ${res.created} messages (${res.suppressed} suppressed).` })
      }
      await loadData()
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || `Failed to execute ${actionName}` })
    } finally {
      setActionLoading(false)
    }
  }

  async function handleRefreshAnalytics() {
    setActionLoading(true)
    setActionMessage(null)
    try {
      const fresh = await computeAnalytics(id)
      setAnalytics(fresh)
      const freshAct = await getCampaignActivity(id).catch(() => [])
      setActivityEvents(freshAct)
      setActionMessage({ type: 'success', text: 'Analytics recomputed successfully.' })
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Failed to refresh analytics' })
    } finally {
      setActionLoading(false)
    }
  }

  async function handleMarkReplied(leadId: string) {
    setActionLoading(true)
    try {
      await markLeadReplied(id, leadId)
      setActionMessage({ type: 'success', text: 'Lead marked as replied — further sequence follow-ups halted.' })
      await loadData()
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Failed to mark lead as replied' })
    } finally {
      setActionLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <Badge variant="success" className="text-xs px-2.5 py-0.5 font-medium">Completed</Badge>
      case 'SENDING':
        return <Badge variant="info" className="text-xs px-2.5 py-0.5 animate-pulse font-medium">Sending</Badge>
      case 'PAUSED':
        return <Badge variant="warning" className="text-xs px-2.5 py-0.5 font-medium">Paused</Badge>
      case 'CANCELLED':
        return <Badge variant="destructive" className="text-xs px-2.5 py-0.5 font-medium">Cancelled</Badge>
      default:
        return <Badge variant="secondary" className="text-xs px-2.5 py-0.5 font-medium">Draft</Badge>
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 max-w-5xl py-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-44 w-full rounded-xl" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      </div>
    )
  }

  if (!campaign) {
    return (
      <div className="text-center py-16">
        <AlertCircle className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
        <h2 className="text-xl font-bold">Campaign not found</h2>
        <p className="text-sm text-muted-foreground mt-1 mb-4">The requested campaign ID does not exist.</p>
        <Button asChild>
          <Link href="/campaigns">Back to Campaigns</Link>
        </Button>
      </div>
    )
  }

  const sent = analytics?.sent || 0
  const delivered = analytics?.delivered || 0
  const opened = analytics?.opened || 0
  const clicked = analytics?.clicked || 0
  const replied = analytics?.replied || 0
  const unsubscribed = analytics?.unsubscribed || 0
  const bounced = analytics?.bounced || 0
  const complained = analytics?.complained || 0
  const totalOpens = analytics?.totalOpens || 0
  const totalClicks = analytics?.totalClicks || 0

  const deliveryRate = sent > 0 ? (delivered / sent) : 0
  const openRate = delivered > 0 ? (opened / delivered) : (sent > 0 ? opened / sent : 0)
  const clickRate = delivered > 0 ? (clicked / delivered) : (sent > 0 ? clicked / sent : 0)
  const ctor = opened > 0 ? (clicked / opened) : 0
  const replyRate = delivered > 0 ? (replied / delivered) : (sent > 0 ? replied / sent : 0)
  const unsubRate = delivered > 0 ? (unsubscribed / delivered) : (sent > 0 ? unsubscribed / sent : 0)
  const bounceRate = sent > 0 ? (bounced / sent) : 0

  return (
    <div className="space-y-6 max-w-5xl pb-16">
      {/* Top Header & Integrated Metadata */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg border text-muted-foreground hover:text-foreground mt-0.5" asChild>
            <Link href="/campaigns">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl font-bold tracking-tight text-foreground">{campaign.name}</h1>
              {getStatusBadge(campaign.status)}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1 flex-wrap font-medium">
              <span className="text-foreground truncate max-w-[260px] flex items-center gap-1">
                <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                {campaign.subject || 'No Subject'}
              </span>
              <span>&bull;</span>
              <span className="truncate max-w-[200px]">From: {campaign.fromEmail || 'SES Default'}</span>
              <span>&bull;</span>
              <Link href={`/audiences/${campaign.audienceId}`} className="text-primary hover:underline flex items-center gap-0.5">
                Audience: {campaign.audienceId.slice(0, 8)}...
                <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {campaign.status === 'DRAFT' && (
            <>
              <Button
                variant="outline"
                size="sm"
                disabled={actionLoading}
                onClick={() => handleAction('generate')}
                className="h-8 text-xs font-medium"
              >
                Pre-Generate
              </Button>
              <Button
                size="sm"
                disabled={actionLoading}
                onClick={() => handleAction('send')}
                className="h-8 text-xs font-semibold bg-primary hover:bg-primary/90"
              >
                <Play className="h-3.5 w-3.5 mr-1.5 fill-current" />
                Start Send
              </Button>
            </>
          )}

          {campaign.status === 'SENDING' && (
            <>
              <Button
                variant="outline"
                size="sm"
                disabled={actionLoading}
                onClick={() => handleAction('pause')}
                className="h-8 text-xs font-medium"
              >
                <Pause className="h-3.5 w-3.5 mr-1.5 text-amber-600" />
                Pause
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={actionLoading}
                onClick={() => handleAction('cancel')}
                className="h-8 text-xs font-medium"
              >
                <XCircle className="h-3.5 w-3.5 mr-1.5" />
                Cancel
              </Button>
            </>
          )}

          {campaign.status === 'PAUSED' && (
            <>
              <Button
                size="sm"
                disabled={actionLoading}
                onClick={() => handleAction('resume')}
                className="h-8 text-xs font-semibold bg-primary hover:bg-primary/90"
              >
                <Play className="h-3.5 w-3.5 mr-1.5 fill-current" />
                Resume
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={actionLoading}
                onClick={() => handleAction('cancel')}
                className="h-8 text-xs font-medium"
              >
                <XCircle className="h-3.5 w-3.5 mr-1.5" />
                Cancel
              </Button>
            </>
          )}

          {campaign.status === 'COMPLETED' && ((sequenceProgress?.statusCounts?.ACTIVE || 0) > 0 || sent === 0) && (
            <Button
              size="sm"
              disabled={actionLoading}
              onClick={() => handleAction('send')}
              className="h-8 text-xs font-semibold bg-primary hover:bg-primary/90"
            >
              <Play className="h-3.5 w-3.5 mr-1.5 fill-current" />
              Dispatch Active Leads
            </Button>
          )}



          <Button
            variant="outline"
            size="sm"
            disabled={actionLoading}
            onClick={handleRefreshAnalytics}
            className="h-8 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${actionLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {actionMessage && (
        <Alert variant={actionMessage.type === 'success' ? 'success' : 'destructive'} className="py-2.5 text-xs rounded-lg">
          <AlertDescription>{actionMessage.text}</AlertDescription>
        </Alert>
      )}

      {/* Unified Performance Panel */}
      <Card className="rounded-xl border shadow-xs bg-card overflow-hidden">
        {/* Performance Header & Conversion Strip */}
        <div className="p-5 pb-4 border-b space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-foreground">Campaign Performance</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Conversion and engagement funnel across {sent.toLocaleString()} dispatched emails
              </p>
            </div>
            {analytics?.computedAt && new Date(analytics.computedAt).getFullYear() > 2020 && (
              <span className="text-[11px] text-muted-foreground font-mono">
                Updated {new Date(analytics.computedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>

          {/* Sleek Segmented Conversion Bar */}
          <div className="space-y-2">
            <div className="h-2 w-full bg-muted rounded-full overflow-hidden flex">
              <div 
                style={{ width: `${Math.max(delivered > 0 ? (delivered / (sent || 1)) * 100 : 0, 2)}%` }} 
                className="bg-emerald-500 h-full transition-all"
                title={`Delivered: ${formatRate(deliveryRate)}`}
              />
              <div 
                style={{ width: `${Math.max(opened > 0 ? (opened / (sent || 1)) * 100 : 0, 1.5)}%` }} 
                className="bg-sky-500 h-full transition-all opacity-90" 
                title={`Opened: ${formatRate(openRate)}`}
              />
              <div 
                style={{ width: `${Math.max(clicked > 0 ? (clicked / (sent || 1)) * 100 : 0, 1)}%` }} 
                className="bg-indigo-500 h-full transition-all opacity-85" 
                title={`Clicked: ${formatRate(clickRate)}`}
              />
              <div 
                style={{ width: `${Math.max(replied > 0 ? (replied / (sent || 1)) * 100 : 0, 1)}%` }} 
                className="bg-purple-500 h-full transition-all" 
                title={`Replied: ${formatRate(replyRate)}`}
              />
            </div>

            {/* Retention Stage Row */}
            <div className="grid grid-cols-5 gap-2 text-center text-xs pt-1">
              <div className="space-y-0.5">
                <span className="text-[10px] uppercase font-semibold text-muted-foreground block">Sent</span>
                <span className="font-bold text-foreground">{sent.toLocaleString()}</span>
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] uppercase font-semibold text-emerald-600 block">Delivered</span>
                <span className="font-bold text-foreground">{delivered.toLocaleString()}</span>
                <span className="text-[10px] text-muted-foreground block">({formatRate(deliveryRate)})</span>
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] uppercase font-semibold text-sky-600 block">Opens</span>
                <span className="font-bold text-foreground">{opened.toLocaleString()}</span>
                <span className="text-[10px] text-muted-foreground block">({formatRate(openRate)})</span>
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] uppercase font-semibold text-indigo-600 block">Clicks</span>
                <span className="font-bold text-foreground">{clicked.toLocaleString()}</span>
                <span className="text-[10px] text-muted-foreground block">({formatRate(clickRate)})</span>
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] uppercase font-semibold text-purple-600 block">Replies</span>
                <span className="font-bold text-foreground">{replied.toLocaleString()}</span>
                <span className="text-[10px] text-muted-foreground block">({formatRate(replyRate)})</span>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Metrics Grid (Single, Non-Repeating Grid) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 border-b">
          {/* Item 1: Opens */}
          <div className="p-4 space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-medium">Unique Opens</span>
              <Eye className="h-3.5 w-3.5 text-sky-600" />
            </div>
            <div className="text-2xl font-bold text-foreground tracking-tight">{opened.toLocaleString()}</div>
            <p className="text-[11px] text-muted-foreground">
              <strong className="text-foreground">{formatRate(openRate)}</strong> &middot; {totalOpens} total
            </p>
          </div>

          {/* Item 2: Clicks */}
          <div className="p-4 space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-medium">Unique Clicks</span>
              <MousePointerClick className="h-3.5 w-3.5 text-indigo-600" />
            </div>
            <div className="text-2xl font-bold text-foreground tracking-tight">{clicked.toLocaleString()}</div>
            <p className="text-[11px] text-muted-foreground">
              <strong className="text-foreground">{formatRate(clickRate)}</strong> &middot; {totalClicks} total
            </p>
          </div>

          {/* Item 3: Click-to-Open */}
          <div className="p-4 space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-medium">Click-to-Open (CTOR)</span>
              <Percent className="h-3.5 w-3.5 text-violet-600" />
            </div>
            <div className="text-2xl font-bold text-foreground tracking-tight">{formatRate(ctor)}</div>
            <p className="text-[11px] text-muted-foreground">
              Clicks per open
            </p>
          </div>

          {/* Item 4: Replies */}
          <div className="p-4 space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-medium">Replies</span>
              <MessageSquareReply className="h-3.5 w-3.5 text-purple-600" />
            </div>
            <div className="text-2xl font-bold text-foreground tracking-tight">{replied.toLocaleString()}</div>
            <p className="text-[11px] text-muted-foreground">
              <strong className="text-foreground">{formatRate(replyRate)}</strong> &middot; Stop-on-reply
            </p>
          </div>
        </div>

        {/* Secondary Row: Delivery & Reputation */}
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 bg-muted/10 text-xs">
          <div className="p-3 px-4">
            <span className="text-muted-foreground block text-[11px]">Dispatched</span>
            <span className="font-semibold text-foreground">{sent.toLocaleString()} messages</span>
          </div>
          <div className="p-3 px-4">
            <span className="text-muted-foreground block text-[11px]">Delivery Rate</span>
            <span className="font-semibold text-emerald-600">{formatRate(deliveryRate)} ({delivered.toLocaleString()})</span>
          </div>
          <div className="p-3 px-4">
            <span className="text-muted-foreground block text-[11px]">Bounces</span>
            <span className="font-semibold text-foreground">{bounced.toLocaleString()} ({formatRate(bounceRate)})</span>
          </div>
          <div className="p-3 px-4">
            <span className="text-muted-foreground block text-[11px]">Unsubs &amp; Spam</span>
            <span className="font-semibold text-foreground">{unsubscribed} unsubs &middot; {complained} spam</span>
          </div>
        </div>
      </Card>

      {/* Sequence Progression Breakdown & Per-Step Metrics */}
      {sequenceProgress && sequenceProgress.steps.length > 0 && (
        <Card className="rounded-xl border shadow-xs bg-card overflow-hidden">
          <CardHeader className="p-4 pb-3 border-b bg-muted/20">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-primary" />
                <CardTitle className="text-sm font-bold">Sequence Follow-up Pipeline</CardTitle>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
                <Badge variant="outline" className="bg-background">
                  {sequenceProgress.totalLeads} Total Prospects
                </Badge>
                <Badge variant="default" className="bg-blue-600 text-[11px]">
                  {sequenceProgress.statusCounts.WAITING_DELAY} Waiting Next Step
                </Badge>
                {sequenceProgress.statusCounts.REPLIED > 0 && (
                  <Badge variant="secondary" className="bg-purple-100 text-purple-800 text-[11px]">
                    {sequenceProgress.statusCounts.REPLIED} Replied
                  </Badge>
                )}
                <Badge variant="default" className="bg-green-600 text-[11px]">
                  {sequenceProgress.statusCounts.COMPLETED} Completed
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            {/* Step Sequence Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {sequenceProgress.steps.map((s, idx) => (
                <div key={s.stepOrder} className="border rounded-lg p-3 bg-muted/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <span className="h-5 w-5 rounded bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">
                        {s.stepOrder}
                      </span>
                      {idx === 0 ? 'Initial Email' : `Follow-up #${idx}`}
                    </span>
                    <span className="text-[10px] text-muted-foreground border px-1.5 py-0.5 rounded bg-background">
                      {s.sendAsReply ? 'Threaded' : 'New Subject'}
                    </span>
                  </div>

                  <p className="text-xs text-muted-foreground truncate font-medium">
                    {idx === 0 ? (campaign.subject || 'Pitch') : (s.sendAsReply ? `Re: ${campaign.subject || 'Original'}` : (s.subject || 'Follow-up'))}
                  </p>

                  <div className="flex items-center justify-between text-[11px] pt-1.5 border-t text-muted-foreground">
                    <span>{idx === 0 ? 'Day 0' : `+${Math.round(s.delayHours / 24)}d`}</span>
                    <span className="font-semibold text-foreground">
                      {s.sentAtStep} Sent &middot; <span className="text-sky-600">{s.opensAtStep ?? 0} opens</span> &middot; <span className="text-purple-600">{s.repliesAtStep ?? 0} replies</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Active Prospects Table */}
            {sequenceProgress.leads.length > 0 && (
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-foreground">Active Prospects ({sequenceProgress.leads.length})</span>
                </div>
                <div className="border rounded-lg overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-muted/40 text-muted-foreground border-b font-medium">
                      <tr>
                        <th className="py-2 px-3">Recipient</th>
                        <th className="py-2 px-3">Step</th>
                        <th className="py-2 px-3">Status</th>
                        <th className="py-2 px-3">Last Sent</th>
                        <th className="py-2 px-3">Next Scheduled</th>
                        <th className="py-2 px-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {sequenceProgress.leads.map((lead) => (
                        <tr key={lead.id} className="hover:bg-muted/20">
                          <td className="py-2 px-3 font-medium text-foreground">
                            {lead.name !== '—' ? `${lead.name} (${lead.email})` : lead.email}
                          </td>
                          <td className="py-2 px-3">
                            <span className="font-semibold text-primary">
                              Step {lead.currentStep}/{sequenceProgress.steps.length}
                            </span>
                          </td>
                          <td className="py-2 px-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                              lead.status === 'REPLIED' ? 'bg-purple-100 text-purple-800' :
                              lead.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                              lead.status === 'WAITING_DELAY' ? 'bg-blue-100 text-blue-800' :
                              lead.status === 'UNSUBSCRIBED' ? 'bg-orange-100 text-orange-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {lead.status}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-muted-foreground">
                            {lead.lastSentAt ? new Date(lead.lastSentAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                          </td>
                          <td className="py-2 px-3 text-muted-foreground font-mono text-[11px]">
                            {lead.nextSendAt ? new Date(lead.nextSendAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                          </td>
                          <td className="py-2 px-3 text-right">
                            {lead.status !== 'REPLIED' && lead.status !== 'UNSUBSCRIBED' && lead.status !== 'BOUNCED' ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={actionLoading}
                                onClick={() => handleMarkReplied(lead.id)}
                                className="h-6 text-[10px] px-2 text-purple-700 hover:text-purple-800 hover:bg-purple-50"
                                title="Mark as replied to halt sequence"
                              >
                                <MessageSquareReply className="h-3 w-3 mr-1" />
                                Replied
                              </Button>
                            ) : lead.status === 'REPLIED' ? (
                              <span className="text-[10px] text-purple-700 font-medium">Halted</span>
                            ) : null}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Recent Engagement Activity Feed */}
      <Card className="rounded-xl border shadow-xs bg-card overflow-hidden">
        <CardHeader className="p-4 pb-3 border-b bg-muted/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm font-bold">Recent Engagement Stream</CardTitle>
            </div>
            <span className="text-[11px] text-muted-foreground">
              {activityEvents.length} events logged
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {activityEvents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-xs">
              No engagement events recorded yet.
            </div>
          ) : (
            <div className="divide-y">
              {activityEvents.slice(0, 12).map((evt) => (
                <div key={evt.id} className="flex items-center justify-between p-3 px-4 text-xs hover:bg-muted/10 transition-colors">
                  <div className="flex items-center gap-2.5">
                    <span className={`h-6 w-6 rounded-md flex items-center justify-center text-[10px] font-bold ${
                      evt.type === 'Open' ? 'bg-sky-50 text-sky-600 border border-sky-200' :
                      evt.type === 'Click' ? 'bg-indigo-50 text-indigo-600 border border-indigo-200' :
                      evt.type === 'Reply' ? 'bg-purple-50 text-purple-600 border border-purple-200' :
                      evt.type === 'Unsubscribe' ? 'bg-amber-50 text-amber-600 border border-amber-200' :
                      'bg-rose-50 text-rose-600 border border-rose-200'
                    }`}>
                      {evt.type === 'Open' && <Eye className="h-3 w-3" />}
                      {evt.type === 'Click' && <MousePointerClick className="h-3 w-3" />}
                      {evt.type === 'Reply' && <MessageSquareReply className="h-3 w-3" />}
                      {evt.type === 'Unsubscribe' && <UserX className="h-3 w-3" />}
                      {evt.type !== 'Open' && evt.type !== 'Click' && evt.type !== 'Reply' && evt.type !== 'Unsubscribe' && <ShieldAlert className="h-3 w-3" />}
                    </span>
                    <div>
                      <span className="font-semibold text-foreground">
                        {evt.contactName ? `${evt.contactName} (${evt.contactEmail})` : evt.contactEmail}
                      </span>
                      <span className="text-muted-foreground ml-1.5">
                        {evt.type === 'Open' && 'opened email'}
                        {evt.type === 'Click' && 'clicked link'}
                        {evt.type === 'Reply' && 'replied'}
                        {evt.type === 'Unsubscribe' && 'opted out'}
                        {evt.type !== 'Open' && evt.type !== 'Click' && evt.type !== 'Reply' && evt.type !== 'Unsubscribe' && `recorded ${evt.type}`}
                        {evt.stepNumber ? ` (Step ${evt.stepNumber})` : ''}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-muted-foreground text-[11px]">
                    {evt.country && (
                      <span className="bg-muted px-1.5 py-0.5 rounded text-[10px] font-mono text-muted-foreground flex items-center gap-1">
                        <Globe className="h-2.5 w-2.5" />
                        {evt.country}
                      </span>
                    )}
                    <span className="font-mono">
                      {new Date(evt.occurredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
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
  Clock, 
  Mail, 
  Eye, 
  MousePointerClick, 
  ShieldAlert, 
  AlertTriangle,
  Loader2,
  Sparkles,
  MessageSquareReply,
  Percent,
  UserX,
  Activity,
  TrendingUp,
  BarChart3,
  Globe,
  Calendar,
  Layers
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
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
  const [activeTab, setActiveTab] = useState<'analytics' | 'activity'>('analytics')

  const loadData = useCallback(async () => {
    try {
      const [cRes, aRes, sRes, actRes] = await Promise.allSettled([
        getCampaign(id),
        getAnalytics(id),
        getSequenceProgress(id),
        getCampaignActivity(id),
      ])
      let cData = cRes.status === 'fulfilled' ? cRes.value : null
      let aData = aRes.status === 'fulfilled' ? aRes.value : null
      let sData = sRes.status === 'fulfilled' ? sRes.value : null
      let actData = actRes.status === 'fulfilled' ? actRes.value : []

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
        return <Badge variant="success" className="text-xs px-2.5 py-0.5">Completed</Badge>
      case 'SENDING':
        return <Badge variant="info" className="text-xs px-2.5 py-0.5 animate-pulse">Sending Live</Badge>
      case 'PAUSED':
        return <Badge variant="warning" className="text-xs px-2.5 py-0.5">Paused</Badge>
      case 'CANCELLED':
        return <Badge variant="destructive" className="text-xs px-2.5 py-0.5">Cancelled</Badge>
      default:
        return <Badge variant="secondary" className="text-xs px-2.5 py-0.5">Draft</Badge>
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 max-w-6xl">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
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
    <div className="space-y-8 max-w-6xl pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl shadow-xs" asChild>
            <Link href="/campaigns">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-extrabold tracking-tight text-foreground">{campaign.name}</h1>
              {getStatusBadge(campaign.status)}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 font-mono">
              Campaign ID: {campaign.id}
            </p>
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
                className="rounded-xl shadow-xs text-xs font-semibold"
              >
                Pre-Generate
              </Button>
              <Button
                size="sm"
                disabled={actionLoading}
                onClick={() => handleAction('send')}
                className="bg-primary hover:bg-primary/90 rounded-xl shadow-xs text-xs font-bold"
              >
                <Play className="h-4 w-4 mr-1.5 fill-current" />
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
                className="rounded-xl shadow-xs text-xs font-semibold"
              >
                <Pause className="h-4 w-4 mr-1.5 text-amber-600" />
                Pause
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={actionLoading}
                onClick={() => handleAction('cancel')}
                className="rounded-xl shadow-xs text-xs font-semibold"
              >
                <XCircle className="h-4 w-4 mr-1.5" />
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
                className="bg-primary hover:bg-primary/90 rounded-xl shadow-xs text-xs font-bold"
              >
                <Play className="h-4 w-4 mr-1.5 fill-current" />
                Resume Send
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={actionLoading}
                onClick={() => handleAction('cancel')}
                className="rounded-xl shadow-xs text-xs font-semibold"
              >
                <XCircle className="h-4 w-4 mr-1.5" />
                Cancel
              </Button>
            </>
          )}

          <Button
            variant="outline"
            size="sm"
            disabled={actionLoading}
            onClick={handleRefreshAnalytics}
            className="rounded-xl shadow-xs text-xs font-semibold"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${actionLoading ? 'animate-spin' : ''}`} />
            Refresh Analytics
          </Button>
        </div>
      </div>

      {actionMessage && (
        <Alert variant={actionMessage.type === 'success' ? 'success' : 'destructive'} className="rounded-xl shadow-xs">
          {actionMessage.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          <AlertDescription>{actionMessage.text}</AlertDescription>
        </Alert>
      )}

      {/* Meta Info Bar */}
      <Card className="rounded-2xl border shadow-xs overflow-hidden bg-card">
        <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="font-bold text-muted-foreground block uppercase text-[10px] tracking-wider">Subject Line</span>
            <span className="text-foreground font-semibold truncate block mt-0.5">{campaign.subject || '—'}</span>
          </div>
          <div>
            <span className="font-bold text-muted-foreground block uppercase text-[10px] tracking-wider">Sender (From)</span>
            <span className="text-foreground font-medium truncate block mt-0.5">
              {campaign.fromName ? `"${campaign.fromName}" ` : ''}
              {campaign.fromEmail ? `<${campaign.fromEmail}>` : '(Default SES)'}
            </span>
          </div>
          <div>
            <span className="font-bold text-muted-foreground block uppercase text-[10px] tracking-wider">Reply-To</span>
            <span className="text-foreground font-medium truncate block mt-0.5">{campaign.replyTo || campaign.fromEmail || '(Default)'}</span>
          </div>
          <div>
            <span className="font-bold text-muted-foreground block uppercase text-[10px] tracking-wider">Target Audience</span>
            <Link href={`/audiences/${campaign.audienceId}`} className="text-primary hover:underline font-mono font-medium block mt-0.5 truncate">
              {campaign.audienceId}
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Conversion Funnel Bar */}
      <Card className="rounded-2xl border shadow-xs overflow-hidden bg-card">
        <CardHeader className="bg-muted/30 pb-3 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm font-bold">Campaign Conversion Pipeline</CardTitle>
            </div>
            <span className="text-[11px] text-muted-foreground font-medium">
              Real-time funnel conversion across audience
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-5 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
            {/* Step 1: Sent */}
            <div className="border rounded-xl p-3 bg-muted/20 space-y-1">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">1. Sent</span>
              <p className="text-xl font-extrabold text-foreground">{sent.toLocaleString()}</p>
              <span className="text-[11px] font-bold text-blue-600 bg-blue-500/10 px-2 py-0.5 rounded-full inline-block">
                100% Base
              </span>
            </div>

            {/* Step 2: Delivered */}
            <div className="border rounded-xl p-3 bg-muted/20 space-y-1">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">2. Delivered</span>
              <p className="text-xl font-extrabold text-emerald-600">{delivered.toLocaleString()}</p>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-500/10 px-2 py-0.5 rounded-full inline-block">
                {formatRate(deliveryRate)}
              </span>
            </div>

            {/* Step 3: Opened */}
            <div className="border rounded-xl p-3 bg-muted/20 space-y-1">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">3. Opened</span>
              <p className="text-xl font-extrabold text-sky-600">{opened.toLocaleString()}</p>
              <span className="text-[11px] font-bold text-sky-700 bg-sky-500/10 px-2 py-0.5 rounded-full inline-block">
                {formatRate(openRate)}
              </span>
            </div>

            {/* Step 4: Clicked */}
            <div className="border rounded-xl p-3 bg-muted/20 space-y-1">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">4. Clicked</span>
              <p className="text-xl font-extrabold text-indigo-600">{clicked.toLocaleString()}</p>
              <span className="text-[11px] font-bold text-indigo-700 bg-indigo-500/10 px-2 py-0.5 rounded-full inline-block">
                {formatRate(clickRate)}
              </span>
            </div>

            {/* Step 5: Replied */}
            <div className="border rounded-xl p-3 bg-muted/20 space-y-1 col-span-2 sm:col-span-1">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">5. Replied</span>
              <p className="text-xl font-extrabold text-purple-600">{replied.toLocaleString()}</p>
              <span className="text-[11px] font-bold text-purple-700 bg-purple-500/10 px-2 py-0.5 rounded-full inline-block">
                {formatRate(replyRate)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Analytics Snapshot Grid (Consistent White Cards with Colored Badges) */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            <h2 className="text-lg font-bold text-foreground">Engagement &amp; Delivery Analytics</h2>
          </div>
          {analytics?.computedAt && new Date(analytics.computedAt).getFullYear() > 2020 && (
            <span className="text-xs text-muted-foreground font-medium">
              Last synced: {new Date(analytics.computedAt).toLocaleDateString()}, {new Date(analytics.computedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Sent */}
          <Card className="rounded-2xl border shadow-xs bg-card hover:shadow-sm transition-all">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total Sent</CardTitle>
              <div className="p-2 bg-blue-500/10 text-blue-600 rounded-xl">
                <Send className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-extrabold text-foreground">{sent.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1 font-medium">Dispatched via Amazon SES</p>
            </CardContent>
          </Card>

          {/* Card 2: Delivered */}
          <Card className="rounded-2xl border shadow-xs bg-card hover:shadow-sm transition-all">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Delivered</CardTitle>
              <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-xl">
                <CheckCircle2 className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-extrabold text-foreground">{delivered.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">
                <span className="font-bold text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded text-[11px]">
                  {formatRate(deliveryRate)}
                </span>{' '}
                delivery rate
              </p>
            </CardContent>
          </Card>

          {/* Card 3: Unique Opens */}
          <Card className="rounded-2xl border shadow-xs bg-card hover:shadow-sm transition-all">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Unique Opens</CardTitle>
              <div className="p-2 bg-sky-500/10 text-sky-600 rounded-xl">
                <Eye className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-extrabold text-foreground">{opened.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">
                <span className="font-bold text-sky-600 bg-sky-500/10 px-1.5 py-0.5 rounded text-[11px]">
                  {formatRate(openRate)}
                </span>{' '}
                open rate &middot; {totalOpens} total
              </p>
            </CardContent>
          </Card>

          {/* Card 4: Unique Clicks */}
          <Card className="rounded-2xl border shadow-xs bg-card hover:shadow-sm transition-all">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Unique Clicks</CardTitle>
              <div className="p-2 bg-indigo-500/10 text-indigo-600 rounded-xl">
                <MousePointerClick className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-extrabold text-foreground">{clicked.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">
                <span className="font-bold text-indigo-600 bg-indigo-500/10 px-1.5 py-0.5 rounded text-[11px]">
                  {formatRate(clickRate)}
                </span>{' '}
                click rate &middot; {totalClicks} total
              </p>
            </CardContent>
          </Card>

          {/* Card 5: Click-to-Open Rate (CTOR) */}
          <Card className="rounded-2xl border shadow-xs bg-card hover:shadow-sm transition-all">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Click-to-Open (CTOR)</CardTitle>
              <div className="p-2 bg-violet-500/10 text-violet-600 rounded-xl">
                <Percent className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-extrabold text-foreground">{formatRate(ctor)}</div>
              <p className="text-xs text-muted-foreground mt-1 font-medium">
                Link engagement among active openers
              </p>
            </CardContent>
          </Card>

          {/* Card 6: Replies Received */}
          <Card className="rounded-2xl border shadow-xs bg-card hover:shadow-sm transition-all">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Replies Received</CardTitle>
              <div className="p-2 bg-purple-500/10 text-purple-600 rounded-xl">
                <MessageSquareReply className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-extrabold text-foreground">{replied.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">
                <span className="font-bold text-purple-600 bg-purple-500/10 px-1.5 py-0.5 rounded text-[11px]">
                  {formatRate(replyRate)}
                </span>{' '}
                reply rate &middot; Stop-on-reply active
              </p>
            </CardContent>
          </Card>

          {/* Card 7: Unsubscribes */}
          <Card className="rounded-2xl border shadow-xs bg-card hover:shadow-sm transition-all">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Unsubscribes</CardTitle>
              <div className="p-2 bg-amber-500/10 text-amber-600 rounded-xl">
                <UserX className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-extrabold text-foreground">{unsubscribed.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">
                <span className="font-bold text-amber-600 bg-amber-500/10 px-1.5 py-0.5 rounded text-[11px]">
                  {formatRate(unsubRate)}
                </span>{' '}
                opt-out rate &middot; Auto-suppressed
              </p>
            </CardContent>
          </Card>

          {/* Card 8: Bounces & Spam Complaints */}
          <Card className="rounded-2xl border shadow-xs bg-card hover:shadow-sm transition-all">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Bounces &amp; Spam</CardTitle>
              <div className="p-2 bg-rose-500/10 text-rose-600 rounded-xl">
                <ShieldAlert className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-extrabold text-foreground">{bounced.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1 font-medium">
                {formatRate(bounceRate)} bounce rate &middot; {complained} spam flags
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Sequence Progression Breakdown & Per-Step Metrics */}
      {sequenceProgress && sequenceProgress.steps.length > 0 && (
        <Card className="rounded-2xl border shadow-xs overflow-hidden bg-card">
          <CardHeader className="bg-muted/30 pb-3 border-b">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-primary" />
                <CardTitle className="text-base font-bold">Outreach Sequence Pipeline &amp; Step Conversion</CardTitle>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
                <Badge variant="outline" className="bg-background">
                  Total Leads: {sequenceProgress.totalLeads}
                </Badge>
                <Badge variant="default" className="bg-blue-600">
                  Waiting Next Step: {sequenceProgress.statusCounts.WAITING_DELAY}
                </Badge>
                {sequenceProgress.statusCounts.REPLIED > 0 && (
                  <Badge variant="secondary" className="bg-purple-100 text-purple-800 font-bold">
                    Replied: {sequenceProgress.statusCounts.REPLIED}
                  </Badge>
                )}
                <Badge variant="default" className="bg-green-600">
                  Completed: {sequenceProgress.statusCounts.COMPLETED}
                </Badge>
                {sequenceProgress.statusCounts.UNSUBSCRIBED > 0 && (
                  <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                    Unsubscribed: {sequenceProgress.statusCounts.UNSUBSCRIBED}
                  </Badge>
                )}
              </div>
            </div>
            <CardDescription className="text-xs">
              Automated multi-step schedule: Follow-ups send automatically if prospect does not reply or unsubscribe.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 space-y-5">
            {/* Step Pipeline Cards with Per-Step Conversion */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {sequenceProgress.steps.map((s, idx) => (
                <div key={s.stepOrder} className="border rounded-xl p-4 bg-muted/20 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground flex items-center gap-2">
                      <span className="h-6 w-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                        {s.stepOrder}
                      </span>
                      {idx === 0 ? 'Initial Email' : `Follow-up #${idx}`}
                    </span>
                    {s.sendAsReply ? (
                      <span className="text-[10px] font-semibold bg-muted px-2 py-0.5 rounded-full text-muted-foreground border">
                        Re: Threaded
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold bg-muted px-2 py-0.5 rounded-full text-muted-foreground border">
                        New Thread
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground truncate font-medium">
                    {idx === 0 ? (campaign.subject || 'Pitch') : (s.sendAsReply ? `Re: ${campaign.subject || 'Original'}` : (s.subject || 'Follow-up'))}
                  </p>

                  {/* Per-step Performance Pills */}
                  <div className="grid grid-cols-3 gap-1.5 pt-2 border-t text-center">
                    <div className="bg-background border rounded-lg p-1.5">
                      <span className="text-[10px] text-muted-foreground block font-semibold">Sent</span>
                      <strong className="text-xs text-foreground">{s.sentAtStep}</strong>
                    </div>
                    <div className="bg-background border rounded-lg p-1.5">
                      <span className="text-[10px] text-muted-foreground block font-semibold">Opens</span>
                      <strong className="text-xs text-sky-600">{s.opensAtStep ?? 0}</strong>
                    </div>
                    <div className="bg-background border rounded-lg p-1.5">
                      <span className="text-[10px] text-muted-foreground block font-semibold">Replies</span>
                      <strong className="text-xs text-purple-600">{s.repliesAtStep ?? 0}</strong>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Recent Leads Progress Table */}
            {sequenceProgress.leads.length > 0 && (
              <div className="space-y-2 pt-2">
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Active Prospects in Sequence (Top {sequenceProgress.leads.length})
                </h4>
                <div className="border rounded-xl overflow-x-auto shadow-xs">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-muted/50 text-muted-foreground border-b font-semibold">
                      <tr>
                        <th className="py-2.5 px-3.5">Recipient</th>
                        <th className="py-2.5 px-3.5">Current Step</th>
                        <th className="py-2.5 px-3.5">Status</th>
                        <th className="py-2.5 px-3.5">Last Sent</th>
                        <th className="py-2.5 px-3.5">Next Follow-up</th>
                        <th className="py-2.5 px-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {sequenceProgress.leads.map((lead) => (
                        <tr key={lead.id} className="hover:bg-muted/20">
                          <td className="py-2.5 px-3.5 font-medium text-foreground">
                            {lead.name !== '—' ? `${lead.name} (${lead.email})` : lead.email}
                          </td>
                          <td className="py-2.5 px-3.5">
                            <span className="font-bold text-primary">
                              Step {lead.currentStep} of {sequenceProgress.steps.length}
                            </span>
                          </td>
                          <td className="py-2.5 px-3.5">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              lead.status === 'REPLIED' ? 'bg-purple-100 text-purple-800' :
                              lead.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                              lead.status === 'WAITING_DELAY' ? 'bg-blue-100 text-blue-800' :
                              lead.status === 'UNSUBSCRIBED' ? 'bg-orange-100 text-orange-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {lead.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-3.5 text-muted-foreground font-medium">
                            {lead.lastSentAt ? new Date(lead.lastSentAt).toLocaleString() : '—'}
                          </td>
                          <td className="py-2.5 px-3.5 text-muted-foreground font-mono text-[11px]">
                            {lead.nextSendAt ? new Date(lead.nextSendAt).toLocaleString() : '—'}
                          </td>
                          <td className="py-2.5 px-3.5 text-right">
                            {lead.status !== 'REPLIED' && lead.status !== 'UNSUBSCRIBED' && lead.status !== 'BOUNCED' ? (
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={actionLoading}
                                onClick={() => handleMarkReplied(lead.id)}
                                className="h-6 text-[10px] px-2.5 text-purple-700 hover:text-purple-800 hover:bg-purple-50 rounded-lg shadow-xs"
                                title="Mark as replied to stop future follow-ups"
                              >
                                <MessageSquareReply className="h-3 w-3 mr-1" />
                                Mark Replied
                              </Button>
                            ) : lead.status === 'REPLIED' ? (
                              <span className="text-[10px] text-purple-700 font-bold flex items-center justify-end gap-1">
                                <CheckCircle2 className="h-3 w-3" />
                                Replied
                              </span>
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

      {/* Real-Time Live Activity Stream */}
      <Card className="rounded-2xl border shadow-xs overflow-hidden bg-card">
        <CardHeader className="bg-muted/30 pb-3 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm font-bold">Real-Time Engagement Activity Feed</CardTitle>
            </div>
            <span className="text-[11px] text-muted-foreground font-medium">
              Latest {activityEvents.length} events
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-5">
          {activityEvents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-xs">
              No recent engagement activity recorded yet.
            </div>
          ) : (
            <div className="space-y-2.5">
              {activityEvents.slice(0, 15).map((evt) => (
                <div key={evt.id} className="flex items-center justify-between border rounded-xl p-3 bg-muted/15 text-xs hover:bg-muted/30 transition-all">
                  <div className="flex items-center gap-3">
                    <span className={`h-6 w-6 rounded-lg flex items-center justify-center text-xs font-bold ${
                      evt.type === 'Open' ? 'bg-sky-500/10 text-sky-600' :
                      evt.type === 'Click' ? 'bg-indigo-500/10 text-indigo-600' :
                      evt.type === 'Reply' ? 'bg-purple-500/10 text-purple-600' :
                      evt.type === 'Unsubscribe' ? 'bg-amber-500/10 text-amber-600' :
                      'bg-rose-500/10 text-rose-600'
                    }`}>
                      {evt.type === 'Open' && <Eye className="h-3.5 w-3.5" />}
                      {evt.type === 'Click' && <MousePointerClick className="h-3.5 w-3.5" />}
                      {evt.type === 'Reply' && <MessageSquareReply className="h-3.5 w-3.5" />}
                      {evt.type === 'Unsubscribe' && <UserX className="h-3.5 w-3.5" />}
                      {evt.type !== 'Open' && evt.type !== 'Click' && evt.type !== 'Reply' && evt.type !== 'Unsubscribe' && <ShieldAlert className="h-3.5 w-3.5" />}
                    </span>
                    <div>
                      <span className="font-bold text-foreground">
                        {evt.contactName ? `${evt.contactName} (${evt.contactEmail})` : evt.contactEmail}
                      </span>
                      <span className="text-muted-foreground ml-2">
                        {evt.type === 'Open' && 'opened email'}
                        {evt.type === 'Click' && 'clicked link'}
                        {evt.type === 'Reply' && 'replied to email'}
                        {evt.type === 'Unsubscribe' && 'unsubscribed'}
                        {evt.type !== 'Open' && evt.type !== 'Click' && evt.type !== 'Reply' && evt.type !== 'Unsubscribe' && `triggered ${evt.type}`}
                        {evt.stepNumber ? ` (Step ${evt.stepNumber})` : ''}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-muted-foreground text-[11px] font-medium">
                    {evt.country && (
                      <span className="bg-background border px-2 py-0.5 rounded-md text-[10px] font-semibold text-foreground flex items-center gap-1">
                        <Globe className="h-3 w-3 text-muted-foreground" />
                        {evt.country}
                      </span>
                    )}
                    <span>{new Date(evt.occurredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
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
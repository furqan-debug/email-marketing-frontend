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
  Sparkles
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
  getSequenceProgress 
} from '@/lib/api'
import type { Campaign, AnalyticsSnapshot, SequenceProgress } from '@/lib/types'
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
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)


  const loadData = useCallback(async () => {
    try {
      const [cRes, aRes, sRes] = await Promise.allSettled([
        getCampaign(id),
        getAnalytics(id),
        getSequenceProgress(id),
      ])
      let cData = cRes.status === 'fulfilled' ? cRes.value : null
      let aData = aRes.status === 'fulfilled' ? aRes.value : null
      let sData = sRes.status === 'fulfilled' ? sRes.value : null

      if (cData) setCampaign(cData)
      if (aData) setAnalytics(aData)
      if (sData) setSequenceProgress(sData)

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
        // Generate messages first if in draft, then send
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
      setActionMessage({ type: 'success', text: 'Analytics recomputed successfully.' })
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Failed to refresh analytics' })
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
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
  const bounced = analytics?.bounced || 0
  const complained = analytics?.complained || 0
  const totalOpens = analytics?.totalOpens || 0
  const totalClicks = analytics?.totalClicks || 0

  const deliveryRate = sent > 0 ? (delivered / sent) : 0
  const openRate = sent > 0 ? (opened / sent) : 0
  const clickRate = sent > 0 ? (clicked / sent) : 0
  const bounceRate = sent > 0 ? (bounced / sent) : 0

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" className="h-9 w-9" asChild>
            <Link href="/campaigns">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold tracking-tight">{campaign.name}</h1>
              {getStatusBadge(campaign.status)}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 font-mono">
              ID: {campaign.id}
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
              >
                Pre-Generate Messages
              </Button>
              <Button
                size="sm"
                disabled={actionLoading}
                onClick={() => handleAction('send')}
              >
                <Play className="h-4 w-4 mr-2" />
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
              >
                <Pause className="h-4 w-4 mr-2 text-amber-600" />
                Pause
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={actionLoading}
                onClick={() => handleAction('cancel')}
              >
                <XCircle className="h-4 w-4 mr-2" />
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
              >
                <Play className="h-4 w-4 mr-2" />
                Resume Send
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={actionLoading}
                onClick={() => handleAction('cancel')}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </>
          )}

          <Button
            variant="outline"
            size="sm"
            disabled={actionLoading}
            onClick={handleRefreshAnalytics}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${actionLoading ? 'animate-spin' : ''}`} />
            Refresh Analytics
          </Button>
        </div>
      </div>

      {actionMessage && (
        <Alert variant={actionMessage.type === 'success' ? 'success' : 'destructive'}>
          {actionMessage.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          <AlertDescription>{actionMessage.text}</AlertDescription>
        </Alert>
      )}

      {/* Meta Info Bar */}
      <Card className="bg-muted/30">
        <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="font-semibold text-muted-foreground block">Subject Line:</span>
            <span className="text-foreground">{campaign.subject || '—'}</span>
          </div>
          <div>
            <span className="font-semibold text-muted-foreground block">Sender (From):</span>
            <span className="text-foreground">
              {campaign.fromName ? `"${campaign.fromName}" ` : ''}
              {campaign.fromEmail ? `<${campaign.fromEmail}>` : '(Default SES)'}
            </span>
          </div>
          <div>
            <span className="font-semibold text-muted-foreground block">Reply-To:</span>
            <span className="text-foreground">{campaign.replyTo || campaign.fromEmail || '(Default)'}</span>
          </div>
          <div>
            <span className="font-semibold text-muted-foreground block">Target Audience:</span>
            <Link href={`/audiences/${campaign.audienceId}`} className="text-primary hover:underline font-mono">
              {campaign.audienceId}
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Sequence Progression Breakdown */}
      {sequenceProgress && sequenceProgress.steps.length > 0 && (
        <Card className="border-primary/30 shadow-xs">
          <CardHeader className="bg-primary/5 pb-3 border-b">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <CardTitle className="text-base">Outreach Sequence Pipeline</CardTitle>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <Badge variant="outline" className="bg-background">
                  Total Leads: {sequenceProgress.totalLeads}
                </Badge>
                <Badge variant="default" className="bg-blue-600">
                  Waiting Next Step: {sequenceProgress.statusCounts.WAITING_DELAY}
                </Badge>
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
            {/* Step Pipeline Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {sequenceProgress.steps.map((s, idx) => (
                <div key={s.stepOrder} className="border rounded-lg p-3.5 bg-card/60 relative space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <span className="h-5 w-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px]">
                        {s.stepOrder}
                      </span>
                      {idx === 0 ? 'Initial Email' : `Follow-up #${idx}`}
                    </span>
                    {s.sendAsReply ? (
                      <span className="text-[10px] font-medium bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                        Re: Threaded
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                        New Thread
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {idx === 0 ? (campaign.subject || 'Pitch') : (s.sendAsReply ? `Re: ${campaign.subject || 'Original'}` : (s.subject || 'Follow-up'))}
                  </p>
                  <div className="text-[11px] font-medium pt-1 border-t flex items-center justify-between text-muted-foreground">
                    <span>{idx === 0 ? 'Day 0 (Launch)' : `+${Math.round(s.delayHours / 24)}d (${s.delayHours}h)`}</span>
                    <span className="text-foreground font-semibold">
                      {s.sentAtStep} Sent / {s.activeAtStep} Active
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Recent Leads Progress Table */}
            {sequenceProgress.leads.length > 0 && (
              <div className="space-y-2 pt-2">
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wide">
                  Active Prospects in Sequence (Top {sequenceProgress.leads.length})
                </h4>
                <div className="border rounded-lg overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-muted/50 text-muted-foreground border-b">
                      <tr>
                        <th className="py-2 px-3 font-semibold">Recipient</th>
                        <th className="py-2 px-3 font-semibold">Current Step</th>
                        <th className="py-2 px-3 font-semibold">Status</th>
                        <th className="py-2 px-3 font-semibold">Last Sent</th>
                        <th className="py-2 px-3 font-semibold">Next Follow-up</th>
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
                              Step {lead.currentStep} of {sequenceProgress.steps.length}
                            </span>
                          </td>
                          <td className="py-2 px-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              lead.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                              lead.status === 'WAITING_DELAY' ? 'bg-blue-100 text-blue-800' :
                              lead.status === 'UNSUBSCRIBED' ? 'bg-orange-100 text-orange-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {lead.status}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-muted-foreground">
                            {lead.lastSentAt ? new Date(lead.lastSentAt).toLocaleString() : '—'}
                          </td>
                          <td className="py-2 px-3 text-muted-foreground font-mono text-[11px]">
                            {lead.nextSendAt ? new Date(lead.nextSendAt).toLocaleString() : '—'}
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

      {/* Stale warning banner */}
      {analytics?.staleWarning && (
        <Alert variant="warning">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle className="text-xs font-semibold">Snapshot Data Warning</AlertTitle>
          <AlertDescription className="text-xs">
            Analytics were last computed more than 30 minutes ago ({analytics.computedAt && new Date(analytics.computedAt).getFullYear() > 2020 ? new Date(analytics.computedAt).toLocaleTimeString() : 'recently'}). Click &quot;Refresh Analytics&quot; to fetch the latest SES events.
          </AlertDescription>
        </Alert>
      )}

      {/* Analytics Snapshot Grid */}
      <div>

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Engagement & Delivery Analytics</h2>
          {analytics?.computedAt && new Date(analytics.computedAt).getFullYear() > 2020 && (
            <span className="text-xs text-muted-foreground">
              Last synced: {new Date(analytics.computedAt).toLocaleDateString()}, {new Date(analytics.computedAt).toLocaleTimeString()}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Sent */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Sent</CardTitle>
              <Send className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-extrabold text-foreground">{sent.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">Dispatched via Amazon SES</p>
            </CardContent>
          </Card>

          {/* Delivered */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Delivered</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
                {delivered.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mt-1 font-semibold">
                {formatRate(deliveryRate)} delivery rate
              </p>
            </CardContent>
          </Card>

          {/* Unique Opens */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Unique Opens</CardTitle>
              <Eye className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-extrabold text-blue-600 dark:text-blue-400">
                {opened.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                <span className="font-semibold text-foreground">{formatRate(openRate)} unique rate</span> &middot; {totalOpens} total fires
              </p>
            </CardContent>
          </Card>

          {/* Unique Clicks */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Unique Clicks</CardTitle>
              <MousePointerClick className="h-4 w-4 text-indigo-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-extrabold text-indigo-600 dark:text-indigo-400">
                {clicked.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                <span className="font-semibold text-foreground">{formatRate(clickRate)} unique rate</span> &middot; {totalClicks} total clicks
              </p>
            </CardContent>
          </Card>

          {/* Bounced */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Bounces</CardTitle>
              <ShieldAlert className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-extrabold text-amber-600 dark:text-amber-400">
                {bounced.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mt-1 font-semibold">
                {formatRate(bounceRate)} bounce rate
              </p>
            </CardContent>
          </Card>

          {/* Complained */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Spam Complaints</CardTitle>
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-extrabold text-destructive">
                {complained.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Automatically added to suppression list
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
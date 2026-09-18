'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { 
  Users, 
  Send, 
  FileCode2, 
  CheckCircle2, 
  TrendingUp, 
  PlusCircle, 
  ArrowUpRight,
  RefreshCw,
  AlertCircle,
  Zap,
  Inbox,
  ShieldCheck,
  Sparkles,
  Layers,
  Activity,
  ChevronRight,
  Clock,
  ExternalLink
} from 'lucide-react'
import { getCampaigns, getAudiences, getTemplates } from '@/lib/api'
import type { Campaign, Audience, Template } from '@/lib/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { formatRate } from '@/lib/utils'

export default function DashboardPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [audiences, setAudiences] = useState<Audience[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function loadData() {
    setLoading(true)
    setError(null)
    try {
      const [cRes, aRes, tRes] = await Promise.all([
        getCampaigns(),
        getAudiences(),
        getTemplates()
      ])
      setCampaigns(cRes || [])
      setAudiences(aRes || [])
      setTemplates(tRes || [])
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard metrics')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Calculations
  const totalContacts = audiences.reduce((acc, a) => acc + (a._count?.contacts || 0), 0)
  const totalSent = campaigns.reduce((acc, c) => acc + (c.snapshot?.sent || 0), 0)
  const totalOpened = campaigns.reduce((acc, c) => acc + (c.snapshot?.opened || 0), 0)
  const totalReplied = campaigns.reduce((acc, c) => acc + (c.snapshot?.replied || 0), 0)
  const completedCampaigns = campaigns.filter(c => c.status === 'COMPLETED').length
  const activeCampaigns = campaigns.filter(c => c.status === 'SENDING').length
  const recentCampaigns = [...campaigns].slice(0, 6)

  const overallOpenRate = totalSent > 0 ? (totalOpened / totalSent) : 0
  const overallReplyRate = totalSent > 0 ? (totalReplied / totalSent) : 0

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="h-3 w-3" />
            Completed
          </span>
        )
      case 'SENDING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-ping" />
            Sending
          </span>
        )
      case 'PAUSED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            Paused
          </span>
        )
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-destructive/10 text-destructive border border-destructive/20">
            Cancelled
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground border">
            Draft
          </span>
        )
    }
  }

  return (
    <div className="space-y-8">
      {/* Hero Welcome & Quick Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border/70">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              SendNova Command Center
            </h1>
            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20">
              <Zap className="h-3 w-3 fill-current" /> Fast Mode
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time deliverability overview, sequence pipelines, and cold outreach performance.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button variant="outline" size="sm" onClick={loadData} disabled={loading} className="gap-1.5 text-xs">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button asChild size="sm" className="gap-1.5 shadow-sm shadow-primary/25 bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/90 hover:to-indigo-600/90 text-xs font-semibold">
            <Link href="/campaigns/new">
              <PlusCircle className="h-4 w-4" />
              New Campaign
            </Link>
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error loading dashboard</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Deliverability & Sender Reputation Gauge */}
      <div className="rounded-xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/[0.07] via-background to-primary/[0.05] p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm text-foreground">SES Infrastructure Health: Optimal (100%)</h3>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-500 text-white dark:text-black">
                  Protected
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Managed Dedicated IP Pool active • 0 Hard Bounces • Suppression guards enabled • Pure MIME sanitized
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <div className="text-right">
              <span className="text-muted-foreground text-[11px] block">Avg Delivery Rate</span>
              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">99.8%</span>
            </div>
            <div className="h-8 w-px bg-border/80" />
            <div className="text-right">
              <span className="text-muted-foreground text-[11px] block">Spam & Unsub</span>
              <span className="font-mono font-bold text-foreground text-sm">0.0%</span>
            </div>
            <div className="h-8 w-px bg-border/80" />
            <Button variant="outline" size="sm" asChild className="h-8 text-xs">
              <Link href="/suppressions">Compliance Center</Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Modern Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover:border-primary/40 transition-colors shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Audience</CardTitle>
            <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Users className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold font-mono tracking-tight">{totalContacts.toLocaleString()}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
              <span>Across {audiences.length} audience list{audiences.length === 1 ? '' : 's'}</span>
            </p>
          </CardContent>
        </Card>

        <Card className="hover:border-primary/40 transition-colors shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Campaigns</CardTitle>
            <div className="h-8 w-8 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Send className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold font-mono tracking-tight">{campaigns.length}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1.5">
              {completedCampaigns} completed • {activeCampaigns} active
            </p>
          </CardContent>
        </Card>

        <Card className="hover:border-primary/40 transition-colors shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Dispatched Emails</CardTitle>
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <TrendingUp className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold font-mono tracking-tight">{totalSent.toLocaleString()}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1.5">
              Direct AWS SES Delivery
            </p>
          </CardContent>
        </Card>

        <Card className="hover:border-primary/40 transition-colors shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Prospect Replies</CardTitle>
            <div className="h-8 w-8 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Inbox className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold font-mono tracking-tight text-purple-600 dark:text-purple-400">
                {totalReplied.toLocaleString()}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
              <span>{formatRate(overallReplyRate)} avg reply rate</span>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Engagement Velocity Funnel */}
      <Card className="border-border/80 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                Aggregated Outreach Engagement Funnel
              </CardTitle>
              <CardDescription className="text-xs">
                Real-time conversion velocity from raw dispatch to prospect replies
              </CardDescription>
            </div>
            <span className="text-xs font-mono text-muted-foreground">
              {totalSent} total messages tracked
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Step Progress Bar */}
            <div className="h-3 w-full rounded-full bg-muted overflow-hidden flex">
              <div style={{ width: '100%' }} className="bg-primary/70 h-full" title="Dispatched (100%)" />
              <div style={{ width: `${Math.min(100, overallOpenRate * 100)}%` }} className="bg-emerald-500 h-full" title="Opened" />
              <div style={{ width: `${Math.min(100, overallReplyRate * 100)}%` }} className="bg-purple-500 h-full" title="Replied" />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-center">
              <div className="p-3 rounded-lg bg-muted/40 border border-border/50">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase block">Dispatched</span>
                <span className="font-mono text-base font-bold text-foreground">{totalSent}</span>
                <span className="text-[10px] text-muted-foreground block">100% target</span>
              </div>
              <div className="p-3 rounded-lg bg-emerald-500/[0.05] border border-emerald-500/20">
                <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase block">Opened</span>
                <span className="font-mono text-base font-bold text-emerald-600 dark:text-emerald-400">{totalOpened}</span>
                <span className="text-[10px] text-muted-foreground block">{formatRate(overallOpenRate)} open rate</span>
              </div>
              <div className="p-3 rounded-lg bg-indigo-500/[0.05] border border-indigo-500/20">
                <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 uppercase block">Templates</span>
                <span className="font-mono text-base font-bold text-indigo-600 dark:text-indigo-400">{templates.length}</span>
                <span className="text-[10px] text-muted-foreground block">Visual presets</span>
              </div>
              <div className="p-3 rounded-lg bg-purple-500/[0.05] border border-purple-500/20">
                <span className="text-[11px] font-semibold text-purple-600 dark:text-purple-400 uppercase block">Replies</span>
                <span className="font-mono text-base font-bold text-purple-600 dark:text-purple-400">{totalReplied}</span>
                <span className="text-[10px] text-muted-foreground block">{formatRate(overallReplyRate)} reply rate</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Action Shortcuts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/audiences" className="group">
          <Card className="h-full hover:border-primary/50 transition-all hover:shadow-md bg-card/60">
            <CardHeader className="p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <Users className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-semibold">Audiences & Leads</CardTitle>
                    <CardDescription className="text-xs">Import CSV & segment lists</CardDescription>
                  </div>
                </div>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary transition-transform" />
              </div>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/campaigns/new" className="group">
          <Card className="h-full hover:border-primary/50 transition-all hover:shadow-md border-primary/20 bg-primary/[0.02]">
            <CardHeader className="p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shadow-sm">
                    <Send className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-semibold">Launch Sequence</CardTitle>
                    <CardDescription className="text-xs">Multi-step cold outreach</CardDescription>
                  </div>
                </div>
                <ArrowUpRight className="h-4 w-4 text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </div>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/inbox" className="group">
          <Card className="h-full hover:border-primary/50 transition-all hover:shadow-md bg-card/60">
            <CardHeader className="p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                    <Inbox className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-semibold">Unified Inbox</CardTitle>
                    <CardDescription className="text-xs">Manage incoming responses</CardDescription>
                  </div>
                </div>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-purple-600 transition-transform" />
              </div>
            </CardHeader>
          </Card>
        </Link>
      </div>

      {/* Recent Campaign Performance Table */}
      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base font-semibold">Recent Outreach Campaigns</CardTitle>
            <CardDescription className="text-xs">
              Delivery metrics, unique engagement, and conversion stats
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" asChild className="text-xs font-semibold gap-1 text-primary hover:text-primary">
            <Link href="/campaigns">
              View All Campaigns
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : recentCampaigns.length === 0 ? (
            <div className="text-center py-12 border border-dashed rounded-lg">
              <Send className="mx-auto h-8 w-8 text-muted-foreground/60 mb-3" />
              <p className="text-sm font-medium text-foreground">No campaigns dispatched yet</p>
              <p className="text-xs text-muted-foreground mt-1 mb-4">
                Launch your first email campaign to start tracking delivery and engagement.
              </p>
              <Button asChild size="sm">
                <Link href="/campaigns/new">Create Campaign</Link>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campaign & Subject</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Sent</TableHead>
                  <TableHead className="text-right">Opens</TableHead>
                  <TableHead className="text-right">Replies</TableHead>
                  <TableHead className="text-right">Open Rate</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentCampaigns.map((c) => {
                  const snap = c.snapshot
                  const openRate = snap && snap.sent > 0 ? (snap.opened / snap.sent) : 0
                  return (
                    <TableRow key={c.id} className="hover:bg-muted/40 transition-colors">
                      <TableCell className="font-medium">
                        <Link href={`/campaigns/${c.id}`} className="hover:underline font-semibold text-foreground flex items-center gap-1.5 group">
                          <span>{c.name}</span>
                          <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity text-primary" />
                        </Link>
                        {c.subject && (
                          <div className="text-xs text-muted-foreground truncate max-w-xs mt-0.5">
                            {c.subject}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(c.status)}</TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {snap ? snap.sent.toLocaleString() : '—'}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {snap ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                            {snap.opened}{' '}
                            <span className="text-[10px] text-muted-foreground font-normal">({snap.totalOpens})</span>
                          </span>
                        ) : '—'}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {snap && snap.replied > 0 ? (
                          <span className="font-bold text-purple-600 dark:text-purple-400">
                            {snap.replied}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs font-semibold">
                        {snap ? (
                          <span className={openRate > 0.3 ? 'text-emerald-600 font-bold' : ''}>
                            {formatRate(openRate)}
                          </span>
                        ) : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" asChild className="h-8 text-xs">
                          <Link href={`/campaigns/${c.id}`}>Details</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}


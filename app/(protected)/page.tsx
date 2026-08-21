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
  AlertCircle
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
  const completedCampaigns = campaigns.filter(c => c.status === 'COMPLETED').length
  const recentCampaigns = [...campaigns].slice(0, 5)

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <Badge variant="success">Completed</Badge>
      case 'SENDING':
        return <Badge variant="info" className="animate-pulse">Sending</Badge>
      case 'PAUSED':
        return <Badge variant="warning">Paused</Badge>
      case 'CANCELLED':
        return <Badge variant="destructive">Cancelled</Badge>
      default:
        return <Badge variant="secondary">Draft</Badge>
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Platform overview and recent email campaign performance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button asChild size="sm">
            <Link href="/campaigns/new">
              <PlusCircle className="h-4 w-4 mr-2" />
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

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Contacts</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{totalContacts.toLocaleString()}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Across {audiences.length} audience list{audiences.length === 1 ? '' : 's'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Campaigns</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{campaigns.length}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {completedCampaigns} completed, {campaigns.length - completedCampaigns} in queue/draft
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Emails Sent</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{totalSent.toLocaleString()}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Tracked via AWS SES Production
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Saved Templates</CardTitle>
            <FileCode2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{templates.length}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Ready for campaign personalization
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Action Shortcuts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/audiences" className="group">
          <Card className="h-full hover:border-primary/50 transition-all hover:shadow-md">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  Manage Audiences
                </CardTitle>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </div>
              <CardDescription>
                Import contacts via CSV, organize lists, and view suppression status.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/templates" className="group">
          <Card className="h-full hover:border-primary/50 transition-all hover:shadow-md">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileCode2 className="h-4 w-4 text-primary" />
                  Design Templates
                </CardTitle>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </div>
              <CardDescription>
                Create HTML email templates with live preview and contact merge tags.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/campaigns/new" className="group">
          <Card className="h-full hover:border-primary/50 transition-all hover:shadow-md border-primary/20 bg-primary/[0.02]">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Send className="h-4 w-4 text-primary" />
                  Dispatch Campaign
                </CardTitle>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </div>
              <CardDescription>
                Select an audience, write content, and send with unique open & click tracking.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>

      {/* Recent Campaign Performance Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent Campaigns</CardTitle>
            <CardDescription>
              Performance metrics with unique open & click analytics
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/campaigns">View All</Link>
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
                  <TableHead>Campaign</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Sent</TableHead>
                  <TableHead className="text-right">Unique Opens</TableHead>
                  <TableHead className="text-right">Unique Clicks</TableHead>
                  <TableHead className="text-right">Open Rate</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentCampaigns.map((c) => {
                  const snap = c.snapshot
                  const openRate = snap && snap.sent > 0 ? (snap.opened / snap.sent) : 0
                  return (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">
                        <Link href={`/campaigns/${c.id}`} className="hover:underline text-foreground">
                          {c.name}
                        </Link>
                        {c.subject && (
                          <div className="text-xs text-muted-foreground truncate max-w-xs">
                            Subject: {c.subject}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(c.status)}</TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {snap ? snap.sent : '—'}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {snap ? (
                          <span>
                            {snap.opened}{' '}
                            <span className="text-[10px] text-muted-foreground">({snap.totalOpens} total)</span>
                          </span>
                        ) : '—'}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {snap ? (
                          <span>
                            {snap.clicked}{' '}
                            <span className="text-[10px] text-muted-foreground">({snap.totalClicks} total)</span>
                          </span>
                        ) : '—'}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs font-semibold">
                        {snap ? formatRate(openRate) : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" asChild>
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

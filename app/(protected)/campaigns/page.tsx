'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { 
  Send, 
  PlusCircle, 
  RefreshCw, 
  AlertCircle, 
  ChevronRight, 
  Eye, 
  MousePointerClick, 
  BarChart3,
  Clock
} from 'lucide-react'
import { getCampaigns } from '@/lib/api'
import type { Campaign } from '@/lib/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { formatRate } from '@/lib/utils'

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

  useEffect(() => {
    loadCampaignsList()
  }, [])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <Badge variant="success">Completed</Badge>
      case 'SENDING':
        return <Badge variant="info" className="animate-pulse">Sending...</Badge>
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
          <h1 className="text-3xl font-bold tracking-tight">Campaigns</h1>
          <p className="text-muted-foreground mt-1">
            Create, dispatch, and track live email marketing broadcasts
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadCampaignsList} disabled={loading}>
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
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Campaigns Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Dispatches</CardTitle>
          <CardDescription>
            Click into any campaign to inspect unique open/click rates and broadcast logs
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : campaigns.length === 0 ? (
            <div className="text-center py-12 border border-dashed rounded-lg">
              <Send className="mx-auto h-8 w-8 text-muted-foreground/60 mb-3" />
              <p className="text-sm font-medium text-foreground">No campaigns created yet</p>
              <p className="text-xs text-muted-foreground mt-1 mb-4">
                Draft and launch your first email campaign to engage with your subscribers.
              </p>
              <Button asChild size="sm">
                <Link href="/campaigns/new">Create Campaign</Link>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campaign Name & Subject</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Sent</TableHead>
                  <TableHead className="text-right">Unique Opens</TableHead>
                  <TableHead className="text-right">Unique Clicks</TableHead>
                  <TableHead className="text-right">Open Rate</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaigns.map((c) => {
                  const snap = c.snapshot
                  const openRate = snap && snap.sent > 0 ? (snap.opened / snap.sent) : 0
                  return (
                    <TableRow 
                      key={c.id} 
                      className="cursor-pointer hover:bg-muted/60 transition-colors"
                      onClick={() => {
                        window.location.href = `/campaigns/${c.id}`
                      }}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Send className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="font-semibold text-foreground hover:underline">
                            {c.name}
                          </span>
                        </div>
                        {c.subject && (
                          <div className="text-xs text-muted-foreground truncate max-w-sm mt-0.5">
                            {c.subject}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(c.status)}</TableCell>
                      <TableCell className="text-right font-mono text-xs font-semibold">
                        {snap ? snap.sent.toLocaleString() : '—'}
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
                      <TableCell className="text-right font-mono text-xs font-bold text-foreground">
                        {snap ? formatRate(openRate) : '—'}
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/campaigns/${c.id}`}>
                            Analytics
                            <ChevronRight className="ml-1 h-3.5 w-3.5" />
                          </Link>
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
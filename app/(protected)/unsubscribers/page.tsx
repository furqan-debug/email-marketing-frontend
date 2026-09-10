'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { 
  UserX, 
  Trash2, 
  RefreshCw, 
  AlertCircle, 
  Search, 
  CheckCircle2, 
  Loader2, 
  Mail, 
  ShieldCheck, 
  ChevronLeft, 
  ChevronRight,
  ExternalLink,
  Globe,
  Radio
} from 'lucide-react'
import { getUnsubscribers, removeSuppression, getCampaigns, getWorkspaces } from '@/lib/api'
import type { Unsubscriber, Campaign, Workspace } from '@/lib/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export default function UnsubscribersPage() {
  const [unsubscribers, setUnsubscribers] = useState<Unsubscriber[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [selectedCampaignId, setSelectedCampaignId] = useState('')
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Resubscribe / Unsuppress Confirm State
  const [resubscribeTarget, setResubscribeTarget] = useState<Unsubscriber | null>(null)
  const [resubscribing, setResubscribing] = useState(false)
  const [resubscribeError, setResubscribeError] = useState<string | null>(null)

  // Search debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  // Load campaigns & workspaces for filters
  useEffect(() => {
    Promise.all([getCampaigns(), getWorkspaces()])
      .then(([cList, wList]) => {
        setCampaigns(cList || [])
        setWorkspaces(wList || [])
      })
      .catch(() => {})
  }, [])

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await getUnsubscribers(
        selectedWorkspaceId || undefined,
        selectedCampaignId || undefined,
        debouncedSearch || undefined,
        page,
        50
      )
      setUnsubscribers(res.data || [])
      setTotal(res.total || 0)
      setPages(res.pages || 1)
    } catch (err: any) {
      setError(err.message || 'Failed to load unsubscribers list')
    } finally {
      setLoading(false)
    }
  }, [selectedWorkspaceId, selectedCampaignId, debouncedSearch, page])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Auto clear success message
  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(null), 4000)
      return () => clearTimeout(timer)
    }
  }, [successMsg])

  async function handleConfirmResubscribe() {
    if (!resubscribeTarget) return
    setResubscribing(true)
    setResubscribeError(null)
    try {
      const targetWs = resubscribeTarget.workspaceId || workspaces[0]?.id || ''
      await removeSuppression(targetWs, resubscribeTarget.email)
      const email = resubscribeTarget.email
      setResubscribeTarget(null)
      setSuccessMsg(`Resubscribed ${email}. Suppression removed — they can receive campaigns again.`)
      await loadData()
    } catch (err: any) {
      setResubscribeError(err.message || 'Failed to resubscribe contact')
    } finally {
      setResubscribing(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2.5">
            <UserX className="h-8 w-8 text-amber-500" />
            Unsubscribers
          </h1>
          <p className="text-muted-foreground mt-1">
            Track prospects who opted out of campaigns, view campaign attribution, and manage opt-out preferences.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button variant="outline" size="sm" asChild>
            <Link href="/suppressions">
              View All Suppressions
            </Link>
          </Button>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {successMsg && (
        <Alert className="border-emerald-500/50 bg-emerald-50/50 text-emerald-900 dark:bg-emerald-950/20 dark:text-emerald-200">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <AlertDescription>{successMsg}</AlertDescription>
        </Alert>
      )}

      {/* Metrics & Filter Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="md:col-span-1">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider">Total Opt-Outs</CardDescription>
            <CardTitle className="text-3xl font-mono text-amber-600 dark:text-amber-400 flex items-center justify-between">
              <span>{total.toLocaleString()}</span>
              <UserX className="h-6 w-6 text-amber-500/40" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Unique unsubscribe events recorded across campaigns
            </p>
          </CardContent>
        </Card>

        <Card className="md:col-span-3">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider">Search & Campaign Filters</CardDescription>
            <CardTitle className="text-base font-normal">
              Filter by campaign, workspace, or search by prospect email and name
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row gap-3 pt-1">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by email, name, or campaign..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            {campaigns.length > 0 && (
              <Select
                value={selectedCampaignId}
                onValueChange={(val) => {
                  setSelectedCampaignId(val === 'all' ? '' : val)
                  setPage(1)
                }}
              >
                <SelectTrigger className="w-full sm:w-52">
                  <SelectValue placeholder="All Campaigns" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Campaigns</SelectItem>
                  {campaigns.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {workspaces.length > 1 && (
              <Select
                value={selectedWorkspaceId}
                onValueChange={(val) => {
                  setSelectedWorkspaceId(val === 'all' ? '' : val)
                  setPage(1)
                }}
              >
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="All Workspaces" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Workspaces</SelectItem>
                  {workspaces.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Unsubscribers Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Opt-Out Records</CardTitle>
              <CardDescription>
                {debouncedSearch || selectedCampaignId
                  ? 'Showing filtered unsubscribe events'
                  : 'All recorded unsubscribe actions across campaigns'}
              </CardDescription>
            </div>
            {total > 0 && (
              <span className="text-xs font-mono text-muted-foreground">
                Page {page} of {pages} ({total} total)
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : unsubscribers.length === 0 ? (
            <div className="text-center py-12 border border-dashed rounded-lg">
              <ShieldCheck className="mx-auto h-9 w-9 text-emerald-500/70 mb-3" />
              <p className="text-sm font-medium text-foreground">
                {debouncedSearch || selectedCampaignId ? 'No matching unsubscribe records found' : 'No unsubscribes recorded yet'}
              </p>
              <p className="text-xs text-muted-foreground mt-1 mb-4">
                {debouncedSearch || selectedCampaignId
                  ? 'Try adjusting your search query or campaign filter.'
                  : 'Recipients who click unsubscribe links in your emails will automatically be listed here.'}
              </p>
              {(debouncedSearch || selectedCampaignId) && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSearch('')
                    setSelectedCampaignId('')
                  }}
                >
                  Reset Filters
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Prospect</TableHead>
                    <TableHead>Campaign</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Unsubscribed At</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {unsubscribers.map((item) => (
                    <TableRow key={item.id} className="hover:bg-muted/50 transition-colors">
                      <TableCell className="font-medium">
                        <div className="flex flex-col">
                          <span className="font-semibold text-foreground font-mono text-xs sm:text-sm">
                            {item.email}
                          </span>
                          {item.name && (
                            <span className="text-xs text-muted-foreground mt-0.5">
                              {item.name}
                            </span>
                          )}
                        </div>
                      </TableCell>

                      <TableCell>
                        <Link
                          href={`/campaigns/${item.campaignId}`}
                          className="inline-flex items-center text-xs font-medium text-primary hover:underline group"
                        >
                          <span>{item.campaignName}</span>
                          <ExternalLink className="ml-1 h-3 w-3 opacity-60 group-hover:opacity-100" />
                        </Link>
                      </TableCell>

                      <TableCell>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-muted text-muted-foreground border">
                          <Radio className="h-3 w-3 text-amber-500" />
                          {item.method}
                        </span>
                      </TableCell>

                      <TableCell className="text-xs text-muted-foreground">
                        {item.country ? (
                          <div className="flex items-center gap-1">
                            <Globe className="h-3.5 w-3.5 text-muted-foreground/70" />
                            <span>{item.country}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground/50">—</span>
                        )}
                      </TableCell>

                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(item.unsubscribedAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </TableCell>

                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs text-muted-foreground hover:text-foreground hover:bg-muted font-medium"
                          onClick={() => {
                            setResubscribeTarget(item)
                            setResubscribeError(null)
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-1.5 text-destructive" />
                          Resubscribe
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination Controls */}
              {pages > 1 && (
                <div className="flex items-center justify-between pt-2 border-t text-sm">
                  <span className="text-xs text-muted-foreground">
                    Showing {(page - 1) * 50 + 1} to {Math.min(page * 50, total)} of {total} entries
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1 || loading}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Previous
                    </Button>
                    <span className="text-xs font-mono px-2">
                      {page} / {pages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= pages || loading}
                      onClick={() => setPage((p) => Math.min(pages, p + 1))}
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resubscribe Confirmation Dialog */}
      <Dialog
        open={!!resubscribeTarget}
        onOpenChange={(open) => {
          if (!open) {
            setResubscribeTarget(null)
            setResubscribeError(null)
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Resubscribe Contact
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to resubscribe <strong>{resubscribeTarget?.email}</strong>?
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 text-xs text-muted-foreground space-y-2">
            <p>
              This will remove <strong>{resubscribeTarget?.email}</strong> from the workspace suppression list. They will become eligible to receive emails in future campaign broadcasts and sequence steps.
            </p>
          </div>

          {resubscribeError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{resubscribeError}</AlertDescription>
            </Alert>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setResubscribeTarget(null)
                setResubscribeError(null)
              }}
              disabled={resubscribing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmResubscribe}
              disabled={resubscribing}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {resubscribing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Resubscribing...
                </>
              ) : (
                'Confirm Resubscribe'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

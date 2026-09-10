'use client'

import { useEffect, useState, useCallback } from 'react'
import { 
  ShieldAlert, 
  PlusCircle, 
  Trash2, 
  RefreshCw, 
  AlertCircle, 
  Search, 
  CheckCircle2, 
  Loader2, 
  Mail, 
  ShieldCheck, 
  ChevronLeft, 
  ChevronRight 
} from 'lucide-react'
import { getSuppressions, addSuppression, removeSuppression, getWorkspaces } from '@/lib/api'
import type { Suppression, Workspace } from '@/lib/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export default function SuppressionsPage() {
  const [suppressions, setSuppressions] = useState<Suppression[]>([])
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Add Dialog State
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [addWorkspaceId, setAddWorkspaceId] = useState('')
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  // Unsuppress Confirm State
  const [unsuppressTarget, setUnsuppressTarget] = useState<Suppression | null>(null)
  const [unsuppressing, setUnsuppressing] = useState(false)
  const [unsuppressError, setUnsuppressError] = useState<string | null>(null)

  // Search debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  // Load initial workspaces
  useEffect(() => {
    getWorkspaces()
      .then((wList) => {
        setWorkspaces(wList || [])
        if (wList && wList.length > 0) {
          setAddWorkspaceId(wList[0].id)
        }
      })
      .catch(() => {})
  }, [])

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await getSuppressions(
        selectedWorkspaceId || undefined,
        debouncedSearch || undefined,
        page,
        50
      )
      setSuppressions(res.data || [])
      setTotal(res.total || 0)
      setPages(res.pages || 1)
    } catch (err: any) {
      setError(err.message || 'Failed to load suppression list')
    } finally {
      setLoading(false)
    }
  }, [selectedWorkspaceId, debouncedSearch, page])

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

  async function handleAddSuppression(e: React.FormEvent) {
    e.preventDefault()
    if (!newEmail.trim() || !addWorkspaceId) return

    setAdding(true)
    setAddError(null)
    try {
      await addSuppression(addWorkspaceId, newEmail.trim())
      setNewEmail('')
      setIsAddOpen(false)
      setSuccessMsg(`Successfully suppressed ${newEmail.trim()}`)
      await loadData()
    } catch (err: any) {
      setAddError(err.message || 'Failed to add suppression')
    } finally {
      setAdding(false)
    }
  }

  async function handleConfirmUnsuppress() {
    if (!unsuppressTarget) return
    setUnsuppressing(true)
    setUnsuppressError(null)
    try {
      await removeSuppression(unsuppressTarget.workspaceId, unsuppressTarget.email)
      const removedEmail = unsuppressTarget.email
      setUnsuppressTarget(null)
      setSuccessMsg(`Unsuppressed ${removedEmail}. They can now receive campaign emails.`)
      await loadData()
    } catch (err: any) {
      setUnsuppressError(err.message || 'Failed to unsuppress email')
    } finally {
      setUnsuppressing(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2.5">
            <ShieldAlert className="h-8 w-8 text-destructive" />
            Suppression List
          </h1>
          <p className="text-muted-foreground mt-1">
            View and manage blocked, unsubscribed, and bounced emails. Suppressed addresses are automatically excluded from campaigns.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <PlusCircle className="h-4 w-4 mr-2" />
                Add Suppression
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleAddSuppression}>
                <DialogHeader>
                  <DialogTitle>Add Email to Suppression List</DialogTitle>
                  <DialogDescription>
                    Manually prevent an email address from receiving any emails from your workspace.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  {addError && (
                    <Alert variant="destructive">
                      <AlertDescription>{addError}</AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="e.g. prospect@example.com"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="workspace">Workspace</Label>
                    {workspaces.length === 0 ? (
                      <div className="text-xs text-muted-foreground">Default workspace active</div>
                    ) : (
                      <Select
                        value={addWorkspaceId}
                        onValueChange={setAddWorkspaceId}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select workspace" />
                        </SelectTrigger>
                        <SelectContent>
                          {workspaces.map((w) => (
                            <SelectItem key={w.id} value={w.id}>
                              {w.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsAddOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={adding || !newEmail.trim() || !addWorkspaceId}>
                    {adding ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      'Suppress Email'
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
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

      {/* Overview Stat & Filter */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="md:col-span-1">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider">Total Suppressed</CardDescription>
            <CardTitle className="text-3xl font-mono text-destructive flex items-center justify-between">
              <span>{total.toLocaleString()}</span>
              <ShieldAlert className="h-6 w-6 text-destructive/40" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Blocked from receiving campaign & sequence broadcasts
            </p>
          </CardContent>
        </Card>

        <Card className="md:col-span-3">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider">Search & Filters</CardDescription>
            <CardTitle className="text-base font-normal">
              Quickly find any contact to check suppression status or restore delivery
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row gap-3 pt-1">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by email address (e.g. henry@digirepsmail.com)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            {workspaces.length > 1 && (
              <Select
                value={selectedWorkspaceId}
                onValueChange={(val) => {
                  setSelectedWorkspaceId(val === 'all' ? '' : val)
                  setPage(1)
                }}
              >
                <SelectTrigger className="w-full sm:w-56">
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

      {/* Suppression List Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Suppressed Contacts</CardTitle>
              <CardDescription>
                {debouncedSearch
                  ? `Showing results matching "${debouncedSearch}"`
                  : 'All emails currently blocked from receiving broadcasts'}
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
          ) : suppressions.length === 0 ? (
            <div className="text-center py-12 border border-dashed rounded-lg">
              <ShieldCheck className="mx-auto h-9 w-9 text-emerald-500/70 mb-3" />
              <p className="text-sm font-medium text-foreground">
                {debouncedSearch ? 'No matching suppressed emails found' : 'No suppressed contacts'}
              </p>
              <p className="text-xs text-muted-foreground mt-1 mb-4">
                {debouncedSearch
                  ? `No suppression records matched "${debouncedSearch}".`
                  : 'Your suppression list is empty. Contacts who unsubscribe or bounce will appear here.'}
              </p>
              {debouncedSearch && (
                <Button size="sm" variant="outline" onClick={() => setSearch('')}>
                  Clear Search Filter
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email Address</TableHead>
                    <TableHead>Workspace</TableHead>
                    <TableHead>Suppressed On</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {suppressions.map((item) => (
                    <TableRow key={item.id} className="hover:bg-muted/50 transition-colors">
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="font-semibold text-foreground font-mono text-xs sm:text-sm">
                            {item.email}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {item.workspace?.name || item.workspaceId}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(item.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-destructive/10 text-destructive border border-destructive/20">
                          <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
                          Suppressed
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs text-muted-foreground hover:text-foreground hover:bg-muted font-medium"
                          onClick={() => {
                            setUnsuppressTarget(item)
                            setUnsuppressError(null)
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-1.5 text-destructive" />
                          Unsuppress
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

      {/* Unsuppress Confirmation Dialog */}
      <Dialog
        open={!!unsuppressTarget}
        onOpenChange={(open) => {
          if (!open) {
            setUnsuppressTarget(null)
            setUnsuppressError(null)
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Unsuppress Email Address
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to remove <strong>{unsuppressTarget?.email}</strong> from the suppression list?
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 text-xs text-muted-foreground space-y-2">
            <p>
              Once unsuppressed, this contact will immediately be eligible to receive campaign broadcasts, sequence steps, and automated workflows again.
            </p>
          </div>

          {unsuppressError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{unsuppressError}</AlertDescription>
            </Alert>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setUnsuppressTarget(null)
                setUnsuppressError(null)
              }}
              disabled={unsuppressing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmUnsuppress}
              disabled={unsuppressing}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {unsuppressing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Unsuppressing...
                </>
              ) : (
                'Confirm Unsuppress'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

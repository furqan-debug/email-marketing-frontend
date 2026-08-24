'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { 
  Users, 
  PlusCircle, 
  Trash2, 
  ChevronRight, 
  RefreshCw, 
  AlertCircle, 
  ArrowRight,
  Database,
  Loader2
} from 'lucide-react'
import { getAudiences, getWorkspaces, createAudience, deleteAudience } from '@/lib/api'
import type { Audience, Workspace } from '@/lib/types'
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

export default function AudiencesPage() {
  const [audiences, setAudiences] = useState<Audience[]>([])
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Dialog State
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [newAudienceName, setNewAudienceName] = useState('')
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState('')
  const [creating, setCreating] = useState(false)
  const [dialogError, setDialogError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Delete confirmation state
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [deleteConfirmName, setDeleteConfirmName] = useState<string>('')
  const [deleteError, setDeleteError] = useState<string | null>(null)

  async function loadData() {
    setLoading(true)
    setError(null)
    try {
      const [aList, wList] = await Promise.all([
        getAudiences(),
        getWorkspaces()
      ])
      setAudiences(aList || [])
      setWorkspaces(wList || [])
      if (wList && wList.length > 0 && !selectedWorkspaceId) {
        setSelectedWorkspaceId(wList[0].id)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load audiences')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  async function handleCreateAudience(e: React.FormEvent) {
    e.preventDefault()
    if (!newAudienceName.trim() || !selectedWorkspaceId) return

    setCreating(true)
    setDialogError(null)
    try {
      await createAudience({
        name: newAudienceName.trim(),
        workspaceId: selectedWorkspaceId,
      })
      setNewAudienceName('')
      setIsDialogOpen(false)
      await loadData()
    } catch (err: any) {
      setDialogError(err.message || 'Failed to create audience')
    } finally {
      setCreating(false)
    }
  }

  function handleDelete(id: string, name: string, e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setDeleteConfirmId(id)
    setDeleteConfirmName(name)
    setDeleteError(null)
  }

  async function confirmDelete() {
    if (!deleteConfirmId) return
    setDeletingId(deleteConfirmId)
    setDeleteError(null)
    try {
      await deleteAudience(deleteConfirmId)
      setDeleteConfirmId(null)
      setDeleteConfirmName('')
      await loadData()
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to delete audience.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Audiences</h1>
          <p className="text-muted-foreground mt-1">
            Manage subscriber lists, import contacts via CSV, and organize recipient groups
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <PlusCircle className="h-4 w-4 mr-2" />
                Create Audience
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleCreateAudience}>
                <DialogHeader>
                  <DialogTitle>New Audience</DialogTitle>
                  <DialogDescription>
                    Create a new contact list to segment your subscribers and campaigns.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  {dialogError && (
                    <Alert variant="destructive">
                      <AlertDescription>{dialogError}</AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="name">Audience Name</Label>
                    <Input
                      id="name"
                      placeholder="e.g. VIP Newsletter, Product Updates"
                      value={newAudienceName}
                      onChange={(e) => setNewAudienceName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="workspace">Workspace</Label>
                    {workspaces.length === 0 ? (
                      <div className="text-xs text-muted-foreground">Default workspace active</div>
                    ) : (
                      <Select
                        value={selectedWorkspaceId}
                        onValueChange={setSelectedWorkspaceId}
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
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={creating || !newAudienceName.trim()}>
                    {creating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      'Create List'
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Audiences Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Audiences</CardTitle>
          <CardDescription>
            Click on any audience to view its contacts, import CSV files, and inspect suppression
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : audiences.length === 0 ? (
            <div className="text-center py-12 border border-dashed rounded-lg">
              <Users className="mx-auto h-8 w-8 text-muted-foreground/60 mb-3" />
              <p className="text-sm font-medium text-foreground">No audiences created yet</p>
              <p className="text-xs text-muted-foreground mt-1 mb-4">
                Create your first audience list to begin importing contacts and sending emails.
              </p>
              <Button size="sm" onClick={() => setIsDialogOpen(true)}>
                Create Audience
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Audience Name</TableHead>
                  <TableHead>Audience ID</TableHead>
                  <TableHead className="text-right">Subscribers</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {audiences.map((aud) => (
                  <TableRow
                    key={aud.id}
                    className="cursor-pointer hover:bg-muted/60 transition-colors"
                    onClick={() => {
                      window.location.href = `/audiences/${aud.id}`
                    }}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="font-semibold text-foreground hover:underline">
                          {aud.name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {aud.id}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs font-semibold">
                      {aud._count?.contacts?.toLocaleString() ?? 0} contacts
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/audiences/${aud.id}`}>
                            View Contacts
                            <ChevronRight className="ml-1 h-3.5 w-3.5" />
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          disabled={deletingId === aud.id}
                          onClick={(e) => handleDelete(aud.id, aud.name, e)}
                          title="Delete audience"
                        >
                          {deletingId === aud.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirmId} onOpenChange={(open) => {
        if (!open) { setDeleteConfirmId(null); setDeleteConfirmName(''); setDeleteError(null) }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Audience</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>"{deleteConfirmName}"</strong>?
              This action cannot be undone and will remove all contacts in this audience.
            </DialogDescription>
          </DialogHeader>
          {deleteError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {deleteError}
                {deleteError.includes('campaign') && (
                  <span className="block mt-1">
                    Go to the <a href="/campaigns" className="underline font-medium">Campaigns page</a> and delete or reassign those campaigns first.
                  </span>
                )}
              </AlertDescription>
            </Alert>
          )}
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => { setDeleteConfirmId(null); setDeleteConfirmName(''); setDeleteError(null) }}
              disabled={!!deletingId}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={!!deletingId}
            >
              {deletingId ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Delete Audience
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

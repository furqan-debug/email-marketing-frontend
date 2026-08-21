'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  Users, 
  UploadCloud, 
  Trash2, 
  ChevronLeft, 
  ChevronRight, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle2, 
  ArrowLeft,
  Loader2,
  Mail,
  Search
} from 'lucide-react'
import { getAudience, getContacts, deleteContact, importCsv } from '@/lib/api'
import type { Audience, Contact, ImportResult } from '@/lib/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

export default function AudienceDetailPage() {
  const { id } = useParams() as { id: string }
  const router = useRouter()

  const [audience, setAudience] = useState<Audience | null>(null)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [totalContacts, setTotalContacts] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage] = useState(1)
  const [limit] = useState(50)
  const [searchQuery, setSearchQuery] = useState('')

  const [loadingAudience, setLoadingAudience] = useState(true)
  const [loadingContacts, setLoadingContacts] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingContactId, setDeletingContactId] = useState<string | null>(null)

  // CSV Upload Dialog
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false)
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<ImportResult | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const loadAudience = useCallback(async () => {
    setLoadingAudience(true)
    try {
      const res = await getAudience(id)
      setAudience(res)
    } catch (err: any) {
      setError(err.message || 'Failed to load audience details')
    } finally {
      setLoadingAudience(false)
    }
  }, [id])

  const loadContactsData = useCallback(async (targetPage = 1) => {
    setLoadingContacts(true)
    try {
      const res = await getContacts(id, targetPage, limit)
      setContacts(res.data || [])
      setTotalContacts(res.total || 0)
      setTotalPages(res.pages || 1)
      setPage(res.page || targetPage)
    } catch (err: any) {
      setError(err.message || 'Failed to load contacts')
    } finally {
      setLoadingContacts(false)
    }
  }, [id, limit])

  useEffect(() => {
    loadAudience()
    loadContactsData(1)
  }, [loadAudience, loadContactsData])

  async function handleDeleteContact(contactId: string) {
    if (!confirm('Are you sure you want to remove this contact from this audience?')) {
      return
    }
    setDeletingContactId(contactId)
    try {
      await deleteContact(contactId)
      await loadContactsData(page)
      await loadAudience()
    } catch (err: any) {
      alert(err.message || 'Failed to delete contact')
    } finally {
      setDeletingContactId(null)
    }
  }

  async function handleCsvUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!csvFile) return

    setUploading(true)
    setUploadError(null)
    setUploadResult(null)

    try {
      const res = await importCsv(id, csvFile)
      setUploadResult(res)
      setCsvFile(null)
      await loadContactsData(1)
      await loadAudience()
    } catch (err: any) {
      setUploadError(err.message || 'CSV upload failed')
    } finally {
      setUploading(false)
    }
  }

  const filteredContacts = searchQuery.trim()
    ? contacts.filter(c => 
        c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.lastName?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : contacts

  return (
    <div className="space-y-8">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" className="h-9 w-9" asChild>
            <Link href="/audiences">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">
                {loadingAudience ? <Skeleton className="h-8 w-40 inline-block" /> : audience?.name}
              </h1>
              <Badge variant="secondary" className="font-mono text-xs">
                {totalContacts.toLocaleString()} contacts
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 font-mono">
              ID: {id}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => loadContactsData(page)} disabled={loadingContacts}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loadingContacts ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          {/* Import CSV Modal */}
          <Dialog open={isCsvModalOpen} onOpenChange={(open) => {
            setIsCsvModalOpen(open)
            if (!open) {
              setUploadResult(null)
              setUploadError(null)
              setCsvFile(null)
            }
          }}>
            <DialogTrigger asChild>
              <Button size="sm">
                <UploadCloud className="h-4 w-4 mr-2" />
                Import Contacts (CSV)
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <form onSubmit={handleCsvUpload}>
                <DialogHeader>
                  <DialogTitle>Import Contacts via CSV</DialogTitle>
                  <DialogDescription>
                    Upload a CSV file containing your subscriber list. The <span className="font-semibold">email</span> header is required.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  {uploadError && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{uploadError}</AlertDescription>
                    </Alert>
                  )}

                  {uploadResult && (
                    <Alert variant="success" className="space-y-1">
                      <CheckCircle2 className="h-4 w-4" />
                      <AlertTitle className="text-sm font-semibold">Import Complete</AlertTitle>
                      <AlertDescription className="text-xs">
                        Imported: <span className="font-semibold">{uploadResult.imported}</span> &middot; 
                        Skipped/Duplicates: <span className="font-semibold">{uploadResult.skipped}</span> &middot; 
                        Errors: <span className="font-semibold">{uploadResult.errors}</span>
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="csvFile">Select CSV File</Label>
                    <Input
                      id="csvFile"
                      type="file"
                      accept=".csv,text/csv"
                      onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                      required
                      className="cursor-pointer"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Supported headers: <code className="bg-muted px-1 py-0.5 rounded">email</code> (required), <code className="bg-muted px-1 py-0.5 rounded">firstName</code>, <code className="bg-muted px-1 py-0.5 rounded">lastName</code>.
                    </p>
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCsvModalOpen(false)}
                  >
                    {uploadResult ? 'Done' : 'Cancel'}
                  </Button>
                  {!uploadResult && (
                    <Button type="submit" disabled={uploading || !csvFile}>
                      {uploading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Importing...
                        </>
                      ) : (
                        'Upload & Process'
                      )}
                    </Button>
                  )}
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

      {/* Contacts Table Card */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle>Audience Members</CardTitle>
            <CardDescription>
              Showing page {page} of {totalPages} ({totalContacts} total active contacts)
            </CardDescription>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Filter page contacts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>
        </CardHeader>
        <CardContent>
          {loadingContacts ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : filteredContacts.length === 0 ? (
            <div className="text-center py-12 border border-dashed rounded-lg">
              <Users className="mx-auto h-8 w-8 text-muted-foreground/60 mb-3" />
              <p className="text-sm font-medium text-foreground">No contacts found</p>
              <p className="text-xs text-muted-foreground mt-1 mb-4">
                {searchQuery ? 'No contacts match your filter search query.' : 'Upload a CSV file to add subscribers to this audience.'}
              </p>
              {!searchQuery && (
                <Button size="sm" onClick={() => setIsCsvModalOpen(true)}>
                  <UploadCloud className="h-4 w-4 mr-2" />
                  Import CSV
                </Button>
              )}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email Address</TableHead>
                    <TableHead>First Name</TableHead>
                    <TableHead>Last Name</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredContacts.map((contact) => (
                    <TableRow key={contact.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="font-mono text-xs">{contact.email}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {contact.firstName || '—'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {contact.lastName || '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          disabled={deletingContactId === contact.id}
                          onClick={() => handleDeleteContact(contact.id)}
                          title="Remove contact"
                        >
                          {deletingContactId === contact.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t mt-4 text-xs text-muted-foreground">
                  <div>
                    Page {page} of {totalPages}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1 || loadingContacts}
                      onClick={() => loadContactsData(page - 1)}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= totalPages || loadingContacts}
                      onClick={() => loadContactsData(page + 1)}
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
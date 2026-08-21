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
  Search, 
  SlidersHorizontal, 
  Table as TableIcon, 
  Sparkles, 
  Check 
} from 'lucide-react'
import { getAudience, getContacts, deleteContact, importCsv } from '@/lib/api'
import type { Audience, Contact, ImportResult, ColumnMapping } from '@/lib/types'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

function parseCsvPreview(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text.split(/\r\n|\n/).map(l => l.trim()).filter(Boolean)
  if (lines.length === 0) return { headers: [], rows: [] }

  const splitCsvLine = (line: string): string[] => {
    const res: string[] = []
    let current = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        res.push(current.trim().replace(/^"|"$/g, ''))
        current = ''
      } else {
        current += char
      }
    }
    res.push(current.trim().replace(/^"|"$/g, ''))
    return res
  }

  const headers = splitCsvLine(lines[0])
  const rows: Record<string, string>[] = []

  for (let i = 1; i < Math.min(lines.length, 5); i++) {
    const vals = splitCsvLine(lines[i])
    const rowObj: Record<string, string> = {}
    headers.forEach((h, idx) => {
      rowObj[h] = vals[idx] || ''
    })
    rows.push(rowObj)
  }

  return { headers, rows }
}

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

  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false)
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [csvHeaders, setCsvHeaders] = useState<string[]>([])
  const [csvPreviewRows, setCsvPreviewRows] = useState<Record<string, string>[]>([])
  const [wizardStep, setWizardStep] = useState<'upload' | 'mapping' | 'done'>('upload')

  const [emailCol, setEmailCol] = useState<string>('')
  const [firstNameCol, setFirstNameCol] = useState<string>('__none__')
  const [lastNameCol, setLastNameCol] = useState<string>('__none__')
  const [customAttributeMappings, setCustomAttributeMappings] = useState<Record<string, { enabled: boolean; tag: string }>>({})

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

  async function handleFileSelect(file: File) {
    setCsvFile(file)
    setUploadError(null)
    const text = await file.text()
    const { headers, rows } = parseCsvPreview(text)

    setCsvHeaders(headers)
    setCsvPreviewRows(rows)

    const findMatch = (candidates: string[]) => {
      return headers.find(h => candidates.some(c => h.trim().toLowerCase() === c.toLowerCase())) || ''
    }

    const detectedEmail = findMatch(['email', 'email address', 'e-mail', 'mail', 'contact email']) || headers[0] || ''
    const detectedFirst = findMatch(['first name', 'firstname', 'first_name', 'fname', 'first']) || '__none__'
    const detectedLast = findMatch(['last name', 'lastname', 'last_name', 'lname', 'last']) || '__none__'

    setEmailCol(detectedEmail)
    setFirstNameCol(detectedFirst)
    setLastNameCol(detectedLast)

    const initialAttrMap: Record<string, { enabled: boolean; tag: string }> = {}
    headers.forEach(h => {
      const lower = h.toLowerCase().trim()
      const isStandard = [detectedEmail, detectedFirst, detectedLast].map(s => s.toLowerCase().trim()).includes(lower) ||
                         ['email', 'first name', 'firstname', 'last name', 'lastname'].includes(lower)
      
      if (!isStandard) {
        const defaultTag = h.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_')
        initialAttrMap[h] = {
          enabled: true,
          tag: defaultTag,
        }
      }
    })

    setCustomAttributeMappings(initialAttrMap)
    setWizardStep('mapping')
  }

  async function handleConfirmImport() {
    if (!csvFile || !emailCol) {
      setUploadError('Please select the column that contains contact email addresses.')
      return
    }

    setUploading(true)
    setUploadError(null)

    const attributesPayload: Record<string, string> = {}
    Object.entries(customAttributeMappings).forEach(([colName, config]) => {
      if (config.enabled && config.tag.trim()) {
        attributesPayload[config.tag.trim()] = colName
      }
    })

    const mappingPayload: ColumnMapping = {
      email: emailCol,
      firstName: firstNameCol !== '__none__' ? firstNameCol : undefined,
      lastName: lastNameCol !== '__none__' ? lastNameCol : undefined,
      attributes: Object.keys(attributesPayload).length > 0 ? attributesPayload : undefined,
    }

    try {
      const res = await importCsv(id, csvFile, mappingPayload)
      setUploadResult(res)
      setWizardStep('done')
      await loadContactsData(1)
      await loadAudience()
    } catch (err: any) {
      setUploadError(err.message || 'Failed to import CSV contacts')
    } finally {
      setUploading(false)
    }
  }

  const filteredContacts = searchQuery.trim()
    ? contacts.filter(c => 
        c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.attributes && JSON.stringify(c.attributes).toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : contacts

  return (
    <div className="space-y-8">
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

          <Dialog open={isCsvModalOpen} onOpenChange={(open) => {
            setIsCsvModalOpen(open)
            if (!open) {
              setWizardStep('upload')
              setCsvFile(null)
              setCsvHeaders([])
              setCsvPreviewRows([])
              setUploadResult(null)
              setUploadError(null)
            }
          }}>
            <DialogTrigger asChild>
              <Button size="sm">
                <UploadCloud className="h-4 w-4 mr-2" />
                Import Contacts (CSV)
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <SlidersHorizontal className="h-5 w-5 text-primary" />
                  Import Contacts &amp; Map CSV Columns
                </DialogTitle>
                <DialogDescription>
                  Upload any CSV format and map your columns to recipient attributes and email merge tags.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 py-3">
                {uploadError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{uploadError}</AlertDescription>
                  </Alert>
                )}

                {wizardStep === 'upload' && (
                  <div className="space-y-4">
                    <div className="border-2 border-dashed rounded-xl p-8 text-center hover:bg-muted/30 transition-colors">
                      <UploadCloud className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
                      <p className="text-sm font-semibold text-foreground">Choose a CSV file from your computer</p>
                      <p className="text-xs text-muted-foreground mt-1 mb-4">
                        Supports any column headers (e.g. Email, First Name, Title, CompanyName, Phone, etc.)
                      </p>
                      <Input
                        id="csvInput"
                        type="file"
                        accept=".csv,text/csv"
                        onChange={(e) => {
                          const f = e.target.files?.[0]
                          if (f) handleFileSelect(f)
                        }}
                        className="max-w-xs mx-auto cursor-pointer"
                      />
                    </div>
                  </div>
                )}

                {wizardStep === 'mapping' && (
                  <div className="space-y-6">
                    <div className="bg-muted/40 rounded-lg p-3 border space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-foreground flex items-center gap-1.5">
                          <TableIcon className="h-3.5 w-3.5 text-primary" />
                          File: {csvFile?.name} ({csvHeaders.length} columns detected)
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-xs text-muted-foreground"
                          onClick={() => setWizardStep('upload')}
                        >
                          Change File
                        </Button>
                      </div>

                      {csvPreviewRows.length > 0 && (
                        <div className="overflow-x-auto max-h-32 border rounded bg-background">
                          <table className="w-full text-[11px]">
                            <thead className="bg-muted/70 border-b">
                              <tr>
                                {csvHeaders.map(h => (
                                  <th key={h} className="px-2 py-1 text-left font-semibold text-muted-foreground">
                                    {h}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {csvPreviewRows.map((r, rIdx) => (
                                <tr key={rIdx} className="border-b last:border-0 hover:bg-muted/30">
                                  {csvHeaders.map(h => (
                                    <td key={h} className="px-2 py-1 text-foreground truncate max-w-[150px]">
                                      {r[h] || '—'}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    <div className="space-y-4">
                      <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        1. Standard Contact Fields
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs">
                            Email Address <span className="text-destructive">*</span>
                          </Label>
                          <Select value={emailCol} onValueChange={setEmailCol}>
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Select column..." />
                            </SelectTrigger>
                            <SelectContent>
                              {csvHeaders.map(h => (
                                <SelectItem key={h} value={h} className="text-xs">
                                  {h}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-xs">First Name</Label>
                          <Select value={firstNameCol} onValueChange={setFirstNameCol}>
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Select column..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__" className="text-xs italic text-muted-foreground">
                                (Don&apos;t map)
                              </SelectItem>
                              {csvHeaders.map(h => (
                                <SelectItem key={h} value={h} className="text-xs">
                                  {h}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-xs">Last Name</Label>
                          <Select value={lastNameCol} onValueChange={setLastNameCol}>
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Select column..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__" className="text-xs italic text-muted-foreground">
                                (Don&apos;t map)
                              </SelectItem>
                              {csvHeaders.map(h => (
                                <SelectItem key={h} value={h} className="text-xs">
                                  {h}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    {Object.keys(customAttributeMappings).length > 0 && (
                      <div className="space-y-3 pt-2 border-t">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                            <Sparkles className="h-3.5 w-3.5 text-primary" />
                            2. Custom Attributes &amp; Email Merge Tags
                          </h4>
                          <span className="text-[11px] text-muted-foreground">
                            Use as &#123;&#123;tag&#125;&#125; in templates
                          </span>
                        </div>

                        <div className="space-y-2 border rounded-lg p-3 bg-background">
                          {Object.entries(customAttributeMappings).map(([colName, config]) => (
                            <div key={colName} className="flex items-center gap-3 p-2 rounded hover:bg-muted/40 text-xs">
                              <input
                                type="checkbox"
                                checked={config.enabled}
                                onChange={(e) => {
                                  setCustomAttributeMappings(prev => ({
                                    ...prev,
                                    [colName]: { ...prev[colName], enabled: e.target.checked }
                                  }))
                                }}
                                className="rounded border-input text-primary focus:ring-1 h-4 w-4"
                                id={`chk-${colName}`}
                              />
                              <label htmlFor={`chk-${colName}`} className="font-semibold w-36 truncate text-foreground cursor-pointer">
                                {colName}
                              </label>

                              <span className="text-muted-foreground text-[11px]">&rarr; Merge Tag:</span>

                              <div className="flex items-center gap-1 flex-1">
                                <span className="font-mono text-muted-foreground">&#123;&#123;</span>
                                <Input
                                  value={config.tag}
                                  disabled={!config.enabled}
                                  onChange={(e) => {
                                    const newTag = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_')
                                    setCustomAttributeMappings(prev => ({
                                      ...prev,
                                      [colName]: { ...prev[colName], tag: newTag }
                                    }))
                                  }}
                                  className="h-7 text-xs font-mono w-40"
                                  placeholder="tag_name"
                                />
                                <span className="font-mono text-muted-foreground">&#125;&#125;</span>
                              </div>

                              {csvPreviewRows[0]?.[colName] && (
                                <span className="text-[10px] text-muted-foreground truncate max-w-[120px] bg-muted/60 px-1.5 py-0.5 rounded">
                                  ex: &ldquo;{csvPreviewRows[0][colName]}&rdquo;
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {wizardStep === 'done' && uploadResult && (
                  <div className="space-y-4 py-4 text-center">
                    <div className="h-12 w-12 rounded-full bg-emerald-500/15 text-emerald-600 flex items-center justify-center mx-auto">
                      <Check className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">Contacts Imported Successfully</h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        All mapped fields and custom attributes are now saved and ready for campaigns.
                      </p>
                    </div>

                    <div className="grid grid-cols-3 gap-2 bg-muted/40 p-3 rounded-lg border max-w-sm mx-auto text-xs">
                      <div>
                        <div className="font-bold text-emerald-600 text-lg">{uploadResult.imported}</div>
                        <div className="text-muted-foreground">Imported</div>
                      </div>
                      <div>
                        <div className="font-bold text-foreground text-lg">{uploadResult.skipped}</div>
                        <div className="text-muted-foreground">Duplicates</div>
                      </div>
                      <div>
                        <div className="font-bold text-destructive text-lg">{uploadResult.errors}</div>
                        <div className="text-muted-foreground">Errors</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter>
                {wizardStep === 'mapping' && (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setWizardStep('upload')}
                    >
                      Back
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      disabled={uploading || !emailCol}
                      onClick={handleConfirmImport}
                    >
                      {uploading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Importing Contacts...
                        </>
                      ) : (
                        'Confirm & Import Contacts'
                      )}
                    </Button>
                  </>
                )}

                {wizardStep === 'done' && (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setIsCsvModalOpen(false)}
                  >
                    Done
                  </Button>
                )}
              </DialogFooter>
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
              placeholder="Filter by email, name, or attribute..."
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
                {searchQuery ? 'No contacts match your filter search query.' : 'Upload a CSV file to add subscribers with custom attributes to this audience.'}
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
                    <TableHead>Custom Attributes &amp; Tags</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredContacts.map((contact) => {
                    const attrs = contact.attributes && typeof contact.attributes === 'object'
                      ? Object.entries(contact.attributes)
                      : []

                    return (
                      <TableRow key={contact.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span className="font-mono text-xs font-semibold">{contact.email}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {contact.firstName || '—'}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {contact.lastName || '—'}
                        </TableCell>
                        <TableCell>
                          {attrs.length === 0 ? (
                            <span className="text-xs text-muted-foreground">—</span>
                          ) : (
                            <div className="flex items-center gap-1.5 flex-wrap max-w-md">
                              {attrs.slice(0, 4).map(([k, v]) => (
                                <Badge key={k} variant="outline" className="text-[10px] py-0 px-1.5 font-normal bg-muted/30">
                                  <span className="font-semibold text-foreground mr-1">{k}:</span>
                                  <span className="truncate max-w-[120px]">{String(v)}</span>
                                </Badge>
                              ))}
                              {attrs.length > 4 && (
                                <span className="text-[10px] text-muted-foreground">+{attrs.length - 4} more</span>
                              )}
                            </div>
                          )}
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
                    )
                  })}
                </TableBody>
              </Table>

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
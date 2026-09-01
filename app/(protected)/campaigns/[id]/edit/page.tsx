'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { 
  Send, 
  ArrowLeft, 
  Users, 
  FileCode2, 
  Eye, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Sparkles, 
  Play, 
  Save, 
  Edit3,
  ChevronLeft,
  ChevronRight,
  User,
  Check
} from 'lucide-react'
import { 
  getCampaign, 
  getAudiences, 
  getTemplates, 
  getTemplate, 
  getContacts,
  updateCampaign, 
  generateMessages, 
  sendCampaign 
} from '@/lib/api'
import type { Audience, Template, Contact, SequenceStepInput, Campaign } from '@/lib/types'
import { renderContactPreview } from '@/lib/utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import EmailComposer from '@/components/EmailComposer'
import SequenceBuilder from '@/components/SequenceBuilder'
import ContactPreviewPicker from '@/components/ContactPreviewPicker'
import MergeTagAlert from '@/components/MergeTagAlert'

export default function EditCampaignPage() {
  const router = useRouter()
  const { id } = useParams() as { id: string }

  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [audiences, setAudiences] = useState<Audience[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [initError, setInitError] = useState<string | null>(null)

  // Form fields
  const [name, setName] = useState('')
  const [subject, setSubject] = useState('')
  const [fromName, setFromName] = useState('Digireps Team')
  const [fromEmail, setFromEmail] = useState('')
  const [replyTo, setReplyTo] = useState('')
  const [audienceId, setAudienceId] = useState('')
  const [contentMode, setContentMode] = useState<'sequence' | 'custom' | 'template'>('sequence')
  const [selectedTemplateId, setSelectedTemplateId] = useState('')
  const [selectedTemplateHtml, setSelectedTemplateHtml] = useState('')
  const [selectedTemplateSubject, setSelectedTemplateSubject] = useState('')
  const [customHtml, setCustomHtml] = useState('')

  const [trackOpens, setTrackOpens] = useState(true)
  const [trackClicks, setTrackClicks] = useState(true)

  // Multi-step follow-up sequence steps
  const [sequenceSteps, setSequenceSteps] = useState<SequenceStepInput[]>([
    {
      stepOrder: 1,
      delayHours: 0,
      sendAsReply: false,
      subject: '',
      htmlBody: '',
    },
  ])

  // Audience contacts for live preview
  const [previewContacts, setPreviewContacts] = useState<Contact[]>([])
  const [previewContactIndex, setPreviewContactIndex] = useState(0)

  // Submit flow
  const [submitting, setSubmitting] = useState(false)
  const [currentStep, setCurrentStep] = useState<string>('')
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)

  useEffect(() => {
    async function loadCampaignAndOptions() {
      try {
        const [cData, aRes, tRes] = await Promise.all([
          getCampaign(id),
          getAudiences(),
          getTemplates(),
        ])
        setCampaign(cData)
        setAudiences(aRes || [])
        setTemplates(tRes || [])

        if (cData) {
          setName(cData.name || '')
          setSubject(cData.subject || '')
          setFromName(cData.fromName || 'Digireps Team')
          setFromEmail(cData.fromEmail || '')
          setReplyTo(cData.replyTo || '')
          setAudienceId(cData.audienceId || (aRes?.[0]?.id || ''))
          setTrackOpens(cData.trackOpens ?? true)
          setTrackClicks(cData.trackClicks ?? true)

          if (cData.steps && cData.steps.length > 0) {
            setContentMode('sequence')
            setSequenceSteps(cData.steps.map(s => ({
              id: s.id,
              stepOrder: s.stepOrder,
              delayHours: s.delayHours ?? 48,
              scheduledAt: s.scheduledAt ? new Date(s.scheduledAt).toISOString() : null,
              sendAtTime: s.sendAtTime || null,
              sendAsReply: s.sendAsReply ?? true,
              subject: s.subject || '',
              htmlBody: s.htmlBody || '',
              templateId: s.templateId || undefined,
            })))
          } else if (cData.templateId) {
            setContentMode('template')
            setSelectedTemplateId(cData.templateId)
            getTemplate(cData.templateId).then(full => {
              setSelectedTemplateHtml(full.html || '')
              setSelectedTemplateSubject(full.subject || '')
            }).catch(() => null)
          } else {
            setContentMode('custom')
            setCustomHtml(cData.htmlBody || '')
          }
        }
      } catch (err: any) {
        setInitError(err.message || 'Failed to load campaign details')
      } finally {
        setLoading(false)
      }
    }
    loadCampaignAndOptions()
  }, [id])

  // Fetch real contacts whenever audience changes to power live preview
  useEffect(() => {
    if (!audienceId) {
      setPreviewContacts([])
      setPreviewContactIndex(0)
      return
    }

    getContacts(audienceId, 1, 10000)
      .then((res) => {
        setPreviewContacts(res.data || [])
        setPreviewContactIndex(0)
      })
      .catch(() => {
        setPreviewContacts([])
      })
  }, [audienceId])


  function handleTemplateChange(tplId: string) {
    setSelectedTemplateId(tplId)
    const tpl = templates.find((t) => t.id === tplId)
    if (tpl) {
      getTemplate(tplId).then(full => {
        const fullSubject = full.subject || tpl.subject || ''
        setSelectedTemplateHtml(full.html || '')
        setSelectedTemplateSubject(fullSubject)
        setSubject(fullSubject)
      }).catch(() => {
        const fallbackSubject = tpl.subject || ''
        setSelectedTemplateHtml(tpl.html || '')
        setSelectedTemplateSubject(fallbackSubject)
        setSubject(fallbackSubject)
      })
    }
  }

  async function handleSubmit(shouldSendImmediately = false) {
    if (!name.trim()) {
      setSubmitError('Please provide a campaign name.')
      return
    }
    if (!audienceId) {
      setSubmitError('Please select a target audience.')
      return
    }

    if (contentMode === 'sequence') {
      const step1Body = sequenceSteps[0]?.htmlBody || ''
      if (!step1Body.trim()) {
        setSubmitError('Step 1 message body cannot be blank.')
        return
      }
    }

    if (contentMode === 'template' && !selectedTemplateId) {
      setSubmitError('Please select an email template or switch to custom HTML.')
      return
    }

    if (contentMode === 'custom' && !customHtml.trim()) {
      setSubmitError('Please enter the custom HTML body for your campaign.')
      return
    }

    setSubmitting(true)
    setSubmitError(null)
    setSaveSuccess(false)

    try {
      setCurrentStep('Saving campaign changes...')

      // Sanitize steps: keep Step 1, and only include Step 2+ if it actually has message content
      const sanitizedSteps = sequenceSteps
        .filter((s, idx) => {
          if (idx === 0) return true
          const plainText = (s.htmlBody || '').replace(/<[^>]*>/g, '').trim()
          return plainText.length > 0 || (s.htmlBody && s.htmlBody.trim().length > 0)
        })
        .map((s, idx) => ({
          ...s,
          stepOrder: idx + 1,
          subject: idx === 0 ? (s.subject || subject).trim() : s.subject?.trim(),
        }))

      const updatePayload = {
        name: name.trim(),
        audienceId,
        subject: (contentMode === 'sequence' ? (sequenceSteps[0]?.subject || subject) : subject).trim() || undefined,
        fromName: fromName.trim() || undefined,
        fromEmail: fromEmail.trim() || undefined,
        replyTo: replyTo.trim() || undefined,
        templateId: contentMode === 'template' ? selectedTemplateId : undefined,
        htmlBody: contentMode === 'custom' ? customHtml : (contentMode === 'sequence' ? sequenceSteps[0]?.htmlBody : undefined),
        isSequence: contentMode === 'sequence',
        trackOpens,
        trackClicks,
        steps: contentMode === 'sequence' ? sanitizedSteps : undefined,
      }

      await updateCampaign(id, updatePayload)

      if (shouldSendImmediately) {
        if (contentMode !== 'sequence') {
          setCurrentStep('Generating message queue & filtering suppressions...')
          await generateMessages(id)
        }
        setCurrentStep('Dispatching emails via SES...')
        await sendCampaign(id)
        router.push(`/campaigns/${id}`)
      } else {
        setSaveSuccess(true)
        setCurrentStep('')
        setTimeout(() => {
          router.push(`/campaigns/${id}`)
        }, 1200)
      }
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to update campaign')
      setCurrentStep('')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 max-w-3xl">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-5xl pb-16">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl shadow-xs" asChild>
            <Link href={`/campaigns/${id}`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Edit Campaign</h1>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                {campaign?.status || 'Draft'}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Edit setup, sender credentials, email content, and automated follow-up sequences.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={submitting}
            onClick={() => handleSubmit(false)}
            className="rounded-xl shadow-xs text-xs font-semibold"
          >
            {saveSuccess ? (
              <>
                <Check className="h-4 w-4 mr-1.5 text-emerald-600" />
                Saved!
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-1.5" />
                Save Changes
              </>
            )}
          </Button>

          {campaign?.status === 'DRAFT' && (
            <Button
              type="button"
              size="sm"
              disabled={submitting || !name.trim() || !audienceId}
              onClick={() => handleSubmit(true)}
              className="bg-primary hover:bg-primary/90 rounded-xl shadow-sm text-xs font-bold px-4"
            >
              <Play className="h-3.5 w-3.5 mr-1.5 fill-current" />
              Save &amp; Send Now
            </Button>
          )}
        </div>
      </div>

      {initError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Setup Error</AlertTitle>
          <AlertDescription>{initError}</AlertDescription>
        </Alert>
      )}

      {submitError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Save Error</AlertTitle>
          <AlertDescription>{submitError}</AlertDescription>
        </Alert>
      )}

      {saveSuccess && (
        <Alert className="bg-emerald-50 border-emerald-200 text-emerald-900">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <AlertTitle>Draft Updated Successfully</AlertTitle>
          <AlertDescription>All campaign settings, email copy, and sequences have been saved.</AlertDescription>
        </Alert>
      )}

      {/* Step 1: Campaign Setup & Sender Config */}
      <Card className="rounded-2xl border shadow-xs overflow-hidden">
        <CardHeader className="bg-muted/30 pb-4 border-b">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <span className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                1
              </span>
              <div>
                <CardTitle className="text-base font-bold">Campaign &amp; Sender Configuration</CardTitle>
                <CardDescription className="text-xs">
                  Define the internal name, target audience, and verified sender credentials
                </CardDescription>
              </div>
            </div>

            {audienceId && (
              <div className="text-xs bg-background border px-3 py-1 rounded-full text-muted-foreground flex items-center gap-1.5 font-medium">
                <Users className="h-3.5 w-3.5 text-primary" />
                <span>
                  {audiences.find((a) => a.id === audienceId)?.name}:{' '}
                  <strong className="text-foreground">
                    {audiences.find((a) => a.id === audienceId)?._count?.contacts ?? previewContacts.length} Contacts
                  </strong>
                </span>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <Label htmlFor="campaignName" className="text-xs font-bold">
                Campaign Name *
              </Label>
              <Input
                id="campaignName"
                placeholder="e.g. Q3 Sales Outreach, August Newsletter"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="text-sm font-medium"
              />
              <p className="text-[11px] text-muted-foreground">Internal name for reporting and analytics.</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="audienceSelect" className="text-xs font-bold">
                Target Audience *
              </Label>
              {audiences.length === 0 ? (
                <div className="text-xs text-muted-foreground pt-2">
                  No audiences found.{' '}
                  <Link href="/audiences" className="text-primary underline">
                    Create Audience
                  </Link>
                </div>
              ) : (
                <Select value={audienceId} onValueChange={setAudienceId}>
                  <SelectTrigger id="audienceSelect" className="text-sm font-medium">
                    <SelectValue placeholder="Select an audience..." />
                  </SelectTrigger>
                  <SelectContent>
                    {audiences.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name} ({a._count?.contacts ?? 0} contacts)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <p className="text-[11px] text-muted-foreground">Recipients who will receive this email broadcast.</p>
            </div>
          </div>

          <div className="pt-3 border-t space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground tracking-wide uppercase">
                Sender Credentials (Amazon SES)
              </span>
              <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-semibold">
                Verified Domain: digireps.org
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="fromName" className="text-xs font-medium">
                  Sender Name (From Name)
                </Label>
                <Input
                  id="fromName"
                  placeholder="e.g. Digireps Team, Ava Morgan"
                  value={fromName}
                  onChange={(e) => setFromName(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="fromEmail" className="text-xs font-medium">
                  Sender Email (From Address)
                </Label>
                <Input
                  id="fromEmail"
                  placeholder="e.g. ava@digireps.org"
                  value={fromEmail}
                  onChange={(e) => setFromEmail(e.target.value)}
                  className="text-xs"
                />
                <p className="text-[10px] text-muted-foreground">Defaults to verified ses@digireps.org if blank</p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="replyTo" className="text-xs font-medium">
                  Reply-To Email (Optional)
                </Label>
                <Input
                  id="replyTo"
                  placeholder="e.g. support@digireps.org"
                  value={replyTo}
                  onChange={(e) => setReplyTo(e.target.value)}
                  className="text-xs"
                />
                <p className="text-[10px] text-muted-foreground">Where prospect replies are directed</p>
              </div>
            </div>
          </div>

          {/* Tracking Controls */}
          <div className="pt-3 border-t space-y-3">
            <div className="space-y-2">
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={trackOpens}
                  onChange={(e) => setTrackOpens(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary mt-0.5 cursor-pointer"
                />
                <div>
                  <span className="text-xs font-bold text-foreground">Track Email Opens (1×1 Tracking Pixel)</span>
                  <p className="text-[11px] text-muted-foreground leading-snug">
                    Injects an invisible pixel to track open rates. Disable for cold outreach if you want clean mail delivery without Gmail image blocking barriers (&quot;Images are not displayed&quot;).
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-2.5 cursor-pointer select-none pt-1">
                <input
                  type="checkbox"
                  checked={trackClicks}
                  onChange={(e) => setTrackClicks(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary mt-0.5 cursor-pointer"
                />
                <div>
                  <span className="text-xs font-bold text-foreground">Track Link Clicks (Click Tracking)</span>
                  <p className="text-[11px] text-muted-foreground leading-snug">
                    Rewrites hyperlinks to track click rates. Disable for cold outreach to links remain 100% direct and raw without any tracking redirects (awstrack.me or server URLs).
                  </p>
                </div>
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Step 2: Content & Follow-up Sequence Builder */}
      <Card className="rounded-2xl border shadow-xs overflow-hidden">
        <CardHeader className="bg-muted/30 pb-4 border-b">
          <div className="flex items-center gap-2.5">
            <span className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
              2
            </span>
            <div>
              <CardTitle className="text-base font-bold">Email Content &amp; Outreach Sequence</CardTitle>
              <CardDescription className="text-xs">
                Choose automated follow-up sequences, single visual composer, or saved HTML templates
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <Tabs 
            value={contentMode} 
            onValueChange={(val) => setContentMode(val as 'sequence' | 'custom' | 'template')}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3 mb-6 h-auto p-1.5 gap-1.5 bg-muted/60 rounded-xl border">
              <TabsTrigger value="sequence" className="flex items-center justify-center gap-2 py-2.5 rounded-lg font-bold text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <Sparkles className="h-4 w-4 text-primary" />
                Multi-Step Sequence (Follow-ups)
              </TabsTrigger>
              <TabsTrigger value="custom" className="flex items-center justify-center gap-2 py-2.5 rounded-lg font-semibold text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <Edit3 className="h-4 w-4" />
                Single Email (Visual Composer)
              </TabsTrigger>
              <TabsTrigger value="template" className="flex items-center justify-center gap-2 py-2.5 rounded-lg font-semibold text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <FileCode2 className="h-4 w-4" />
                Use Saved Template
              </TabsTrigger>
            </TabsList>

            {/* Mode 1: Automated Multi-Step Sequence */}
            <TabsContent value="sequence" className="space-y-4">
              <SequenceBuilder
                steps={sequenceSteps}
                onChange={setSequenceSteps}
                initialSubject={subject}
                onInitialSubjectChange={setSubject}
                contacts={previewContacts}
                selectedContactIndex={previewContactIndex}
                onContactIndexChange={setPreviewContactIndex}
              />
            </TabsContent>

            {/* Mode 2: Template Selection */}
            <TabsContent value="template" className="space-y-4">
              {templates.length === 0 ? (
                <div className="text-center py-6 border border-dashed rounded-lg">
                  <p className="text-xs text-muted-foreground">No saved templates found.</p>
                  <Button variant="outline" size="sm" asChild className="mt-2 text-xs">
                    <Link href="/templates">Create Template</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="templateSelect">Select Template</Label>
                    <Select value={selectedTemplateId} onValueChange={handleTemplateChange}>
                      <SelectTrigger id="templateSelect">
                        <SelectValue placeholder="Choose a template..." />
                      </SelectTrigger>
                      <SelectContent>
                        {templates.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.name} {t.subject ? `(${t.subject})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Template Preview */}
                  {selectedTemplateHtml && (() => {
                    const activeContact = previewContacts.length > 0 ? (previewContacts[previewContactIndex] || previewContacts[0]) : null
                    const activeTplSubject = selectedTemplateSubject || templates.find(t => t.id === selectedTemplateId)?.subject || subject

                    return (
                      <div className="space-y-3 pt-3 border-t">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-foreground flex items-center gap-1.5 bg-primary/10 text-primary px-2.5 py-1 rounded">
                              <Eye className="h-3.5 w-3.5" />
                              Template Live Preview
                            </span>
                          </div>

                          <Link
                            href="/templates"
                            className="text-xs text-primary hover:underline font-medium flex items-center gap-1"
                          >
                            <Edit3 className="h-3 w-3" /> Edit in Templates
                          </Link>
                        </div>

                        {previewContacts.length > 0 && (
                          <div className="flex flex-wrap items-center justify-between gap-2 bg-muted/40 border rounded-lg px-3 py-2 text-xs">
                            <div className="flex items-center gap-2">
                              <ContactPreviewPicker
                                contacts={previewContacts}
                                selectedIndex={previewContactIndex}
                                onSelectIndex={setPreviewContactIndex}
                              />
                            </div>
                          </div>
                        )}

                        <MergeTagAlert
                          content={`${activeTplSubject} ${selectedTemplateHtml}`}
                          contacts={previewContacts}
                          compact
                        />

                        <div className="border rounded-xl bg-card shadow-xs overflow-hidden">
                          {activeTplSubject && (
                            <div className="p-4 bg-muted/20 border-b space-y-1.5 text-xs">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-muted-foreground w-12 shrink-0">To:</span>
                                <span className="font-medium text-foreground truncate">
                                  {activeContact
                                    ? `${[activeContact.firstName, activeContact.lastName].filter(Boolean).join(' ') || 'Recipient'} <${activeContact.email}>`
                                    : 'Alex Morgan <alex@example.com>'}
                                </span>
                              </div>
                              <div className="flex items-start gap-2">
                                <span className="font-bold text-foreground w-12 shrink-0 mt-0.5">Subject:</span>
                                <span className="font-bold text-sm text-primary leading-snug">
                                  {renderContactPreview(activeTplSubject, activeContact)}
                                </span>
                              </div>
                            </div>
                          )}

                          <div className="p-6 bg-white text-zinc-900 max-h-[380px] overflow-y-auto">
                            <div
                              dangerouslySetInnerHTML={{
                                __html: renderContactPreview(selectedTemplateHtml, activeContact),
                              }}
                              className="email-content-editable"
                            />
                          </div>
                        </div>
                      </div>
                    )
                  })()}
                </div>
              )}
            </TabsContent>

            {/* Mode 3: Single Visual Composer */}
            <TabsContent value="custom" className="space-y-3">
              <EmailComposer
                value={customHtml}
                onChange={setCustomHtml}
                subject={subject}
                placeholder="Type your email broadcast message here..."
                minHeight="260px"
                contacts={previewContacts}
                selectedContactIndex={previewContactIndex}
                onContactIndexChange={setPreviewContactIndex}
              />
            </TabsContent>
          </Tabs>
        </CardContent>

        <CardFooter className="bg-muted/20 p-5 border-t flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-muted-foreground flex items-center gap-2">
            <span>Ready to save changes for audience:</span>
            <strong className="text-foreground">
              {audiences.find((a) => a.id === audienceId)?._count?.contacts ?? previewContacts.length} Recipients
            </strong>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              size="default"
              disabled={submitting}
              onClick={() => handleSubmit(false)}
              className="rounded-xl shadow-xs text-xs font-semibold"
            >
              {submitting && currentStep.includes('Saving') ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : saveSuccess ? (
                <>
                  <Check className="mr-2 h-4 w-4 text-emerald-600" />
                  Saved!
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>

            {campaign?.status === 'DRAFT' && (
              <Button
                type="button"
                size="default"
                disabled={submitting || !name.trim() || !audienceId}
                onClick={() => handleSubmit(true)}
                className="bg-primary hover:bg-primary/90 rounded-xl shadow-sm text-xs font-bold px-5"
              >
                {submitting && !currentStep.includes('Saving') ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {currentStep || 'Processing...'}
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4 fill-current" />
                    Save &amp; Send Now
                  </>
                )}
              </Button>
            )}
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}

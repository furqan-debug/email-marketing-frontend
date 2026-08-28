'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
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
  User
} from 'lucide-react'
import { 
  getAudiences, 
  getTemplates, 
  getTemplate, 
  getContacts,
  createCampaign, 
  generateMessages, 
  sendCampaign 
} from '@/lib/api'
import type { Audience, Template, Contact, SequenceStepInput } from '@/lib/types'
import { renderContactPreview } from '@/lib/utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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


export default function NewCampaignPage() {
  const router = useRouter()

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
    {
      stepOrder: 2,
      delayHours: 48,
      sendAsReply: true,
      subject: '',
      htmlBody: '',
    },
  ])

  // Audience contacts for live preview
  const [previewContacts, setPreviewContacts] = useState<Contact[]>([])
  const [previewContactIndex, setPreviewContactIndex] = useState(0)
  const [loadingContacts, setLoadingContacts] = useState(false)


  // Submit flow
  const [submitting, setSubmitting] = useState(false)
  const [currentStep, setCurrentStep] = useState<string>('')
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    async function loadFormOptions() {
      try {
        const [aRes, tRes] = await Promise.all([
          getAudiences(),
          getTemplates(),
        ])
        setAudiences(aRes || [])
        setTemplates(tRes || [])
        if (aRes && aRes.length > 0) {
          setAudienceId(aRes[0].id)
        }
        if (tRes && tRes.length > 0) {
          setSelectedTemplateId(tRes[0].id)
          // Load full html
          getTemplate(tRes[0].id).then(full => {
            setSelectedTemplateHtml(full.html || '')
            if (full.subject && !subject) setSubject(full.subject)
          })
        }
      } catch (err: any) {
        setInitError(err.message || 'Failed to load audiences or templates')
      } finally {
        setLoading(false)
      }
    }
    loadFormOptions()
  }, [])

  // Fetch real contacts whenever audience changes to power live preview
  useEffect(() => {
    if (!audienceId) {
      setPreviewContacts([])
      setPreviewContactIndex(0)
      return
    }
    setLoadingContacts(true)
    getContacts(audienceId, 1, 10000)
      .then((res) => {
        setPreviewContacts(res.data || [])
        setPreviewContactIndex(0)
      })

      .catch((err) => {
        console.warn('Failed to fetch audience contacts for preview:', err)
        setPreviewContacts([])
        setPreviewContactIndex(0)
      })
      .finally(() => setLoadingContacts(false))
  }, [audienceId])


  async function handleTemplateChange(tplId: string) {
    setSelectedTemplateId(tplId)
    if (!tplId) {
      setSelectedTemplateHtml('')
      return
    }
    try {
      const full = await getTemplate(tplId)
      setSelectedTemplateHtml(full.html || '')
      if (full.subject && !subject) {
        setSubject(full.subject)
      }
    } catch {
      setSelectedTemplateHtml('')
    }
  }

  async function handleSubmit(shouldSendImmediately: boolean) {
    if (!name.trim() || !audienceId) {
      setSubmitError('Campaign name and target audience are required.')
      return
    }

    if (contentMode === 'sequence') {
      const step1Subject = sequenceSteps[0]?.subject?.trim() || subject.trim()
      const step1Html = sequenceSteps[0]?.htmlBody?.trim()
      if (!step1Subject) {
        setSubmitError('Please enter a Subject Line for Step 1.')
        return
      }
      if (!step1Html) {
        setSubmitError('Please enter Email Body content for Step 1.')
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

    try {
      // 1. Create Campaign
      setCurrentStep('1/3: Creating campaign & sequence steps...')
      const campaignPayload = {
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
        steps: contentMode === 'sequence' ? sequenceSteps.map((s, idx) => ({
          ...s,
          stepOrder: idx + 1,
          subject: idx === 0 ? (s.subject || subject).trim() : s.subject?.trim(),
        })) : undefined,
      }


      const campaign = await createCampaign(campaignPayload)

      // 2. Generate Messages (only needed for single-shot campaigns, sequence handles leads dynamically)
      if (contentMode !== 'sequence') {
        setCurrentStep('2/3: Generating message queue & filtering suppressions...')
        await generateMessages(campaign.id)
      }

      // 3. Send if requested
      if (shouldSendImmediately) {
        setCurrentStep('3/3: Dispatching emails via SES...')
        await sendCampaign(campaign.id)
      }

      router.push(`/campaigns/${campaign.id}`)
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to process campaign')
      setCurrentStep('')
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

  const activeHtmlPreview = contentMode === 'template' ? selectedTemplateHtml : customHtml

  return (
    <div className="space-y-8 max-w-5xl pb-16">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl shadow-xs" asChild>
            <Link href="/campaigns">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Create Campaign</h1>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                New
              </span>
            </div>
            <p className="text-muted-foreground text-xs mt-0.5">
              Set up your sender details, select target audience, and build automated outreach sequences.
            </p>
          </div>
        </div>

        {/* Stepper Progress Indicator */}
        <div className="hidden md:flex items-center gap-2 text-xs font-medium text-muted-foreground bg-muted/40 border px-3.5 py-1.5 rounded-xl shadow-xs">
          <span className="flex items-center gap-1.5 text-primary font-bold">
            <span className="h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px]">1</span>
            Setup &amp; Audience
          </span>
          <span className="text-border font-bold">──</span>
          <span className="flex items-center gap-1.5 text-primary font-bold">
            <span className="h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px]">2</span>
            Email Sequence
          </span>
          <span className="text-border font-bold">──</span>
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span className="h-5 w-5 rounded-full bg-muted border flex items-center justify-center text-[10px]">3</span>
            Dispatch
          </span>
        </div>
      </div>

      {initError && (
        <Alert variant="destructive" className="rounded-xl">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{initError}</AlertDescription>
        </Alert>
      )}

      {submitError && (
        <Alert variant="destructive" className="rounded-xl">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{submitError}</AlertDescription>
        </Alert>
      )}

      {audiences.length === 0 ? (
        <Card className="border-dashed py-12 text-center rounded-2xl">
          <CardContent className="space-y-3">
            <Users className="mx-auto h-10 w-10 text-muted-foreground/50" />
            <h3 className="font-semibold text-base">No Audiences Available</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              You must create at least one audience and import contacts before sending a campaign.
            </p>
            <Button asChild className="mt-2" size="sm">
              <Link href="/audiences">Go to Audiences</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {/* Card 1: Setup & Target */}
          <Card className="rounded-2xl border shadow-xs overflow-hidden">
            <CardHeader className="bg-muted/30 pb-4 border-b">
              <div className="flex items-center justify-between">
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
                  <div className="hidden sm:flex items-center gap-1.5 text-xs bg-background border px-3 py-1 rounded-lg font-medium shadow-xs">
                    <Users className="h-3.5 w-3.5 text-primary" />
                    <span>
                      {audiences.find((a) => a.id === audienceId)?.name || 'Audience'}:{' '}
                      <strong className="text-foreground">
                        {audiences.find((a) => a.id === audienceId)?._count?.contacts ?? 0} Contacts
                      </strong>
                    </span>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {/* Row 1: Campaign Name & Audience */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <Label htmlFor="cName" className="text-xs font-bold text-foreground">
                    Campaign Name *
                  </Label>
                  <Input
                    id="cName"
                    placeholder="e.g. Q3 Sales Outreach or Product Launch"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="h-10"
                  />
                  <p className="text-[11px] text-muted-foreground">Internal name for reporting and analytics.</p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="cAudience" className="text-xs font-bold text-foreground">
                    Target Audience *
                  </Label>
                  <Select value={audienceId} onValueChange={setAudienceId}>
                    <SelectTrigger id="cAudience" className="h-10">
                      <SelectValue placeholder="Select target audience..." />
                    </SelectTrigger>
                    <SelectContent>
                      {audiences.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name} ({a._count?.contacts ?? 0} contacts)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground">Recipients who will receive this email broadcast.</p>
                </div>
              </div>

              {/* Row 2: Sender Details (From Name, From Email, Reply-To) */}
              <div className="pt-4 border-t space-y-4">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                    Sender Credentials (Amazon SES)
                  </h4>
                  <span className="text-[10px] text-green-700 font-semibold bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-full">
                    Verified Domain: digireps.org
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="cFromName" className="text-xs font-semibold text-foreground">
                      Sender Name (From Name)
                    </Label>
                    <Input
                      id="cFromName"
                      placeholder="e.g. Digireps Team"
                      value={fromName}
                      onChange={(e) => setFromName(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="cFromEmail" className="text-xs font-semibold text-foreground">
                      Sender Email (From Address)
                    </Label>
                    <Input
                      id="cFromEmail"
                      placeholder="e.g. support@digireps.org"
                      value={fromEmail}
                      onChange={(e) => setFromEmail(e.target.value)}
                      className="h-9 text-xs"
                    />
                    <p className="text-[10px] text-muted-foreground">
                      Defaults to verified <code className="font-mono">noreply@digireps.org</code>
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="cReplyTo" className="text-xs font-semibold text-foreground">
                      Reply-To Email (Optional)
                    </Label>
                    <Input
                      id="cReplyTo"
                      placeholder="e.g. support@digireps.org"
                      value={replyTo}
                      onChange={(e) => setReplyTo(e.target.value)}
                      className="h-9 text-xs"
                    />
                    <p className="text-[10px] text-muted-foreground">Where prospect replies are directed.</p>
                  </div>
                </div>

                {/* Deliverability & Tracking Options */}
                <div className="pt-4 border-t space-y-3">
                  <div className="flex items-start justify-between gap-4 p-3.5 rounded-xl border bg-muted/20 hover:bg-muted/30 transition-colors">
                    <div className="space-y-1">
                      <Label htmlFor="trackOpens" className="text-xs font-bold text-foreground flex items-center gap-1.5 cursor-pointer">
                        Track Email Opens (1×1 Tracking Pixel)
                      </Label>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        Injects an invisible pixel to track open rates. <strong>Disable for cold outreach</strong> if you want clean text delivery without Gmail image blocking banners (<em>"Images are not displayed"</em>).
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      id="trackOpens"
                      checked={trackOpens}
                      onChange={(e) => setTrackOpens(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary mt-1 cursor-pointer"
                    />
                  </div>

                  <div className="flex items-start justify-between gap-4 p-3.5 rounded-xl border bg-muted/20 hover:bg-muted/30 transition-colors">
                    <div className="space-y-1">
                      <Label htmlFor="trackClicks" className="text-xs font-bold text-foreground flex items-center gap-1.5 cursor-pointer">
                        Track Link Clicks (Click Tracking)
                      </Label>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        Rewrites hyperlinks to track click rates. <strong>Disable for cold outreach</strong> so links remain 100% direct and raw without any tracking redirects (<em>awstrack.me</em> or server URLs).
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      id="trackClicks"
                      checked={trackClicks}
                      onChange={(e) => setTrackClicks(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary mt-1 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>



          {/* Card 2: Email Content & Sequence Builder */}
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



                {/* Mode 1: Template Selection */}
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

                      {/* Template Preview with Audience Member Navigator */}
                      {selectedTemplateHtml && (() => {
                        const activeContact = previewContacts.length > 0 ? (previewContacts[previewContactIndex] || previewContacts[0]) : null
                        return (
                          <div className="space-y-3 pt-3 border-t">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-foreground flex items-center gap-1.5 bg-primary/10 text-primary px-2.5 py-1 rounded">
                                  <Eye className="h-3.5 w-3.5" />
                                  Template Live Preview
                                </span>
                                {previewContacts.length > 0 ? (
                                  <span className="text-[11px] font-medium text-muted-foreground">
                                    (Using 1st row & members from selected audience)
                                  </span>
                                ) : (
                                  <span className="text-[11px] text-muted-foreground">
                                    (Using sample preview data)
                                  </span>
                                )}
                              </div>

                              <Link
                                href="/templates"
                                className="text-xs text-primary hover:underline font-medium flex items-center gap-1"
                              >
                                <Edit3 className="h-3 w-3" /> Edit in Templates
                              </Link>
                            </div>

                            {/* Recipient Navigator Bar */}
                            {previewContacts.length > 0 && (
                              <div className="flex flex-wrap items-center justify-between gap-2 bg-muted/40 border rounded-lg px-3 py-2 text-xs">
                                <div className="flex items-center gap-2">
                                  <ContactPreviewPicker
                                    contacts={previewContacts}
                                    selectedIndex={previewContactIndex}
                                    onSelectIndex={setPreviewContactIndex}
                                  />
                                </div>

                                {activeContact?.attributes?.companyName || activeContact?.attributes?.company ? (
                                  <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                                    <span>Company:</span>
                                    <span className="text-primary font-medium">
                                      {activeContact.attributes?.companyName || activeContact.attributes?.company}
                                    </span>
                                  </div>
                                ) : null}
                              </div>
                            )}

                            {/* Rendered Email Envelope with Subject & Body */}
                            <div className="border rounded-xl bg-card shadow-xs overflow-hidden">

                              {subject && (
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
                                      {renderContactPreview(subject, activeContact)}
                                    </span>
                                  </div>
                                </div>
                              )}

                              <div className="p-6 bg-white text-zinc-900 max-h-[380px] overflow-y-auto">
                                <div
                                  dangerouslySetInnerHTML={{
                                    __html: renderContactPreview(selectedTemplateHtml, activeContact),
                                  }}
                                  className={`email-content-editable ${
                                    selectedTemplateHtml.includes('line-height: 1.25') || 
                                    selectedTemplateHtml.includes('line-height: 1.3') || 
                                    selectedTemplateHtml.includes('margin-bottom: 4px') || 
                                    selectedTemplateHtml.includes('spacing-compact')
                                      ? 'spacing-compact'
                                      : selectedTemplateHtml.includes('line-height: 2') || 
                                        selectedTemplateHtml.includes('spacing-relaxed')
                                      ? 'spacing-relaxed'
                                      : 'spacing-normal'
                                  }`}
                                />
                              </div>
                            </div>
                          </div>
                        )
                      })()}

                    </div>
                  )}
                </TabsContent>

                {/* Mode 2: Compose Email */}
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

            <CardFooter className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-muted/30 border-t p-5 rounded-b-2xl">
              <div className="flex items-center gap-3 text-xs text-muted-foreground font-medium">
                {currentStep ? (
                  <span className="text-primary font-bold flex items-center gap-2 bg-primary/10 px-3 py-1.5 rounded-lg">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    {currentStep}
                  </span>
                ) : (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 text-foreground font-semibold">
                      <Send className="h-3.5 w-3.5 text-primary" />
                      Amazon SES Engine
                    </span>
                    <span>•</span>
                    <span>{contentMode === 'sequence' ? `${sequenceSteps.length} Sequence Steps` : 'Single Email Broadcast'}</span>
                    {audienceId && (
                      <>
                        <span>•</span>
                        <span className="text-primary font-medium">
                          {audiences.find((a) => a.id === audienceId)?._count?.contacts ?? 0} Recipients
                        </span>
                      </>
                    )}
                  </div>
                )}
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
                  <Save className="h-4 w-4 mr-2" />
                  Save as Draft
                </Button>

                <Button
                  type="button"
                  size="default"
                  disabled={submitting || !name.trim() || !audienceId}
                  onClick={() => handleSubmit(true)}
                  className="bg-primary hover:bg-primary/90 rounded-xl shadow-sm text-xs font-bold px-5"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-4 w-4 fill-current" />
                      Create &amp; Send Now
                    </>
                  )}
                </Button>
              </div>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  )
}
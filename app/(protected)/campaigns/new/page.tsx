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
  Save
} from 'lucide-react'
import { 
  getAudiences, 
  getTemplates, 
  getTemplate, 
  createCampaign, 
  generateMessages, 
  sendCampaign 
} from '@/lib/api'
import type { Audience, Template } from '@/lib/types'
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
  const [contentMode, setContentMode] = useState<'template' | 'custom'>('template')
  const [selectedTemplateId, setSelectedTemplateId] = useState('')
  const [selectedTemplateHtml, setSelectedTemplateHtml] = useState('')
  const [customHtml, setCustomHtml] = useState('')

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
      setCurrentStep('1/3: Creating campaign...')
      const campaignPayload = {
        name: name.trim(),
        audienceId,
        subject: subject.trim() || undefined,
        fromName: fromName.trim() || undefined,
        fromEmail: fromEmail.trim() || undefined,
        replyTo: replyTo.trim() || undefined,
        templateId: contentMode === 'template' ? selectedTemplateId : undefined,
        htmlBody: contentMode === 'custom' ? customHtml : undefined,
      }
      const campaign = await createCampaign(campaignPayload)

      // 2. Generate Messages
      setCurrentStep('2/3: Generating message queue & filtering suppressions...')
      await generateMessages(campaign.id)

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
    <div className="space-y-8 max-w-4xl pb-12">
      {/* Top Header */}
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" className="h-9 w-9" asChild>
          <Link href="/campaigns">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Create New Campaign</h1>
          <p className="text-muted-foreground text-xs mt-0.5">
            Configure broadcast metadata, recipient list, sender details, and email content
          </p>
        </div>
      </div>

      {initError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{initError}</AlertDescription>
        </Alert>
      )}

      {submitError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{submitError}</AlertDescription>
        </Alert>
      )}

      {audiences.length === 0 ? (
        <Card className="border-dashed py-12 text-center">
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
        <div className="space-y-6">
          {/* Card 1: Setup & Target */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base">1. Campaign Details &amp; Sender Configuration</CardTitle>
              <CardDescription>
                Define the broadcast name, subject line, custom sender email, and recipient list
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="cName">Campaign Name *</Label>
                  <Input
                    id="cName"
                    placeholder="e.g. August Feature Announcement"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cSubject">Email Subject Line</Label>
                  <Input
                    id="cSubject"
                    placeholder="e.g. Exciting product updates for {{first_name}}!"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="cFromName">From Name (Display Sender)</Label>
                  <Input
                    id="cFromName"
                    placeholder="e.g. Digireps Team"
                    value={fromName}
                    onChange={(e) => setFromName(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cFromEmail">From Email (Sender Address)</Label>
                  <Input
                    id="cFromEmail"
                    placeholder="e.g. support@digireps.org or team@digireps.org"
                    value={fromEmail}
                    onChange={(e) => setFromEmail(e.target.value)}
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Leave blank to use default verified address.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="cReplyTo">Reply-To Email (Optional)</Label>
                  <Input
                    id="cReplyTo"
                    placeholder="e.g. support@digireps.org (where recipient replies go)"
                    value={replyTo}
                    onChange={(e) => setReplyTo(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cAudience">Target Audience *</Label>
                  <Select value={audienceId} onValueChange={setAudienceId}>
                    <SelectTrigger id="cAudience">
                      <SelectValue placeholder="Select target audience" />
                    </SelectTrigger>
                    <SelectContent>
                      {audiences.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name} ({a._count?.contacts ?? 0} contacts)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Email Content */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base">2. Email Content & Design</CardTitle>
              <CardDescription>
                Choose an existing HTML template or provide custom HTML markup
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Tabs 
                value={contentMode} 
                onValueChange={(val) => setContentMode(val as 'template' | 'custom')}
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="template" className="flex items-center gap-2">
                    <FileCode2 className="h-4 w-4" />
                    Use Saved Template
                  </TabsTrigger>
                  <TabsTrigger value="custom" className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    Custom HTML Body
                  </TabsTrigger>
                </TabsList>

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
                  )}
                </TabsContent>

                {/* Mode 2: Custom HTML */}
                <TabsContent value="custom" className="space-y-3">
                  <Label htmlFor="customHtml">Custom HTML</Label>
                  <Textarea
                    id="customHtml"
                    value={customHtml}
                    onChange={(e) => setCustomHtml(e.target.value)}
                    placeholder="<html><body><h1>Hello {{first_name}}</h1><p>Your message...</p></body></html>"
                    className="font-mono text-xs min-h-[220px] bg-slate-950 text-slate-50 p-4"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Tip: Use <code className="bg-muted px-1 py-0.5 rounded">&#123;&#123;first_name&#125;&#125;</code>, <code className="bg-muted px-1 py-0.5 rounded">&#123;&#123;last_name&#125;&#125;</code>, <code className="bg-muted px-1 py-0.5 rounded">&#123;&#123;email&#125;&#125;</code>, <code className="bg-muted px-1 py-0.5 rounded">&#123;&#123;title&#125;&#125;</code>, <code className="bg-muted px-1 py-0.5 rounded">&#123;&#123;company_name&#125;&#125;</code>, or any custom tags defined in your audience.
                  </p>
                </TabsContent>
              </Tabs>

              {/* Live Preview Box */}
              {activeHtmlPreview && (
                <div className="mt-4 pt-4 border-t space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                    <Eye className="h-3.5 w-3.5" />
                    Live Content Preview
                  </div>
                  <div className="border rounded-lg bg-white overflow-hidden shadow-inner max-h-[320px] overflow-y-auto">
                    <iframe
                      srcDoc={activeHtmlPreview.replace(/\{\{first_name\}\}/g, 'Recipient').replace(/\{\{last_name\}\}/g, 'User').replace(/\{\{email\}\}/g, 'recipient@example.com')}
                      title="Campaign Preview"
                      className="w-full min-h-[280px] border-0"
                      sandbox="allow-same-origin"
                    />
                  </div>
                </div>
              )}
            </CardContent>

            <CardFooter className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-muted/20 border-t pt-4">
              <div className="text-xs text-muted-foreground font-medium">
                {currentStep ? (
                  <span className="text-primary font-semibold flex items-center gap-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    {currentStep}
                  </span>
                ) : (
                  'Ready to dispatch via AWS SES'
                )}
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button
                  type="button"
                  variant="outline"
                  disabled={submitting}
                  onClick={() => handleSubmit(false)}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save as Draft
                </Button>

                <Button
                  type="button"
                  disabled={submitting || !name.trim() || !audienceId}
                  onClick={() => handleSubmit(true)}
                  className="bg-primary hover:bg-primary/90"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-4 w-4" />
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
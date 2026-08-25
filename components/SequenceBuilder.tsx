'use client'

import React from 'react'
import {
  Plus,
  Trash2,
  Clock,
  MessageSquare,
  Mail,
  Sparkles,
  ArrowDown,
  Calendar,
  Layers,
  CheckCircle2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import EmailComposer from '@/components/EmailComposer'
import type { SequenceStepInput, Contact } from '@/lib/types'

interface SequenceBuilderProps {
  steps: SequenceStepInput[]
  onChange: (steps: SequenceStepInput[]) => void
  initialSubject: string
  onInitialSubjectChange: (subject: string) => void
  contacts?: Contact[]
  selectedContactIndex?: number
  onContactIndexChange?: (index: number) => void
}

export default function SequenceBuilder({
  steps,
  onChange,
  initialSubject,
  onInitialSubjectChange,
  contacts = [],
  selectedContactIndex = 0,
  onContactIndexChange,
}: SequenceBuilderProps) {
  // Ensure we always have at least Step 1
  const sequenceSteps = steps.length > 0 ? steps : [
    {
      stepOrder: 1,
      delayHours: 0,
      sendAsReply: false,
      subject: initialSubject || '',
      htmlBody: '',
    }
  ]

  const updateStep = (index: number, partial: Partial<SequenceStepInput>) => {
    const updated = [...sequenceSteps]
    updated[index] = { ...updated[index], ...partial }
    // If Step 1 subject changes, notify parent
    if (index === 0 && partial.subject !== undefined) {
      onInitialSubjectChange(partial.subject)
    }
    onChange(updated)
  }

  const addFollowupStep = () => {
    const nextOrder = sequenceSteps.length + 1
    const newStep: SequenceStepInput = {
      stepOrder: nextOrder,
      delayHours: 48, // Default 2 days (48 hours)
      sendAsReply: true,
      subject: '',
      htmlBody: '',
    }
    onChange([...sequenceSteps, newStep])
  }

  const removeStep = (index: number) => {
    if (sequenceSteps.length <= 1) return
    const filtered = sequenceSteps.filter((_, i) => i !== index)
    // Re-index stepOrder
    const reindexed = filtered.map((s, idx) => ({
      ...s,
      stepOrder: idx + 1,
      delayHours: idx === 0 ? 0 : s.delayHours,
      sendAsReply: idx === 0 ? false : s.sendAsReply,
    }))
    onChange(reindexed)
  }

  const totalDays = sequenceSteps.reduce((acc, s) => acc + Math.round((s.delayHours || 0) / 24), 0)

  return (
    <div className="space-y-6">
      {/* Top Banner Summary */}
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-muted/40 border border-primary/20 rounded-xl p-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/15 rounded-xl text-primary flex items-center justify-center">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-sm text-foreground">
                  Automated Multi-Step Outreach Sequence
                </h4>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-primary/10 text-primary rounded-full border border-primary/20">
                  Automated Follow-ups
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Send initial email and schedule intelligent follow-up steps with automatic reply detection.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold">
            <span className="bg-background/80 border px-3 py-1.5 rounded-lg shadow-xs flex items-center gap-1.5 text-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              {sequenceSteps.length} {sequenceSteps.length === 1 ? 'Step' : 'Steps'}
            </span>
            <span className="bg-background/80 border px-3 py-1.5 rounded-lg shadow-xs flex items-center gap-1.5 text-foreground">
              <Calendar className="h-3.5 w-3.5 text-primary" />
              ~{totalDays} Days Total
            </span>
            <span className="bg-green-500/10 border border-green-500/20 text-green-700 px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-[11px]">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Stop on reply: Active
            </span>
          </div>
        </div>
      </div>

      {/* Step Sequence Ladder */}
      <div className="space-y-4">
        {sequenceSteps.map((step, idx) => {
          const isStep1 = idx === 0
          const delayDays = Math.round((step.delayHours || 0) / 24)

          return (
            <div key={idx} className="space-y-4">
              {/* Connector / Delay between steps */}
              {!isStep1 && (
                <div className="flex flex-col items-center justify-center my-1">
                  <div className="w-0.5 h-5 bg-primary/30 dashed" />
                  <div className="flex items-center gap-2.5 bg-background border-2 border-primary/30 rounded-full px-4 py-1.5 shadow-sm my-1 text-xs transition-all hover:border-primary">
                    <Clock className="h-3.5 w-3.5 text-primary animate-pulse" />
                    <span className="font-semibold text-foreground">Wait delay:</span>
                    <select
                      className="h-6 text-xs bg-primary/5 hover:bg-primary/10 border border-primary/20 rounded-md px-2 font-bold text-primary outline-none cursor-pointer"
                      value={step.delayHours}
                      onChange={(e) => updateStep(idx, { delayHours: Number(e.target.value) })}
                    >
                      <option value={24}>1 Day (24 Hours)</option>
                      <option value={48}>2 Days (48 Hours)</option>
                      <option value={72}>3 Days (72 Hours)</option>
                      <option value={96}>4 Days (96 Hours)</option>
                      <option value={120}>5 Days (120 Hours)</option>
                      <option value={168}>7 Days (1 Week)</option>
                      <option value={240}>10 Days</option>
                      <option value={336}>14 Days (2 Weeks)</option>
                    </select>
                    <span className="text-muted-foreground text-[11px]">after Step {idx} (if no reply)</span>
                  </div>
                  <div className="w-0.5 h-5 bg-primary/30" />
                  <ArrowDown className="h-4 w-4 text-primary -mt-1.5" />
                </div>
              )}

              {/* Step Card */}
              <div className="border rounded-2xl bg-card shadow-xs overflow-hidden transition-all hover:shadow-md">
                {/* Step Header */}
                <div className="flex flex-wrap items-center justify-between bg-muted/40 px-5 py-3.5 border-b gap-2">
                  <div className="flex items-center gap-3">
                    <span className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold shadow-xs ${
                      isStep1 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-primary/20 text-primary border border-primary/30'
                    }`}>
                      {idx + 1}
                    </span>
                    <div>
                      <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                        {isStep1 ? 'Step 1: Initial Outreach Email' : `Step ${idx + 1}: Follow-up #${idx}`}
                        {isStep1 ? (
                          <span className="text-[10px] font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-full border border-primary/20">
                            Sent at Launch
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold bg-blue-500/10 text-blue-700 px-2 py-0.5 rounded-full border border-blue-500/20">
                            Scheduled +{delayDays}d
                          </span>
                        )}
                      </h4>
                      <p className="text-[11px] text-muted-foreground">
                        {isStep1 
                          ? 'Opening pitch sent to all recipients when campaign is launched' 
                          : `Automatically dispatched ${delayDays} day(s) later if prospect has not replied`}
                      </p>
                    </div>
                  </div>

                  {!isStep1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeStep(idx)}
                      className="h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 rounded-lg"
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" />
                      Remove Step
                    </Button>
                  )}
                </div>

                {/* Step Content Form */}
                <div className="p-5 space-y-4">
                  {/* Step 1: Subject Line */}
                  {isStep1 ? (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-bold flex items-center gap-1.5">
                          <Mail className="h-3.5 w-3.5 text-primary" />
                          Initial Email Subject Line *
                        </Label>
                        <span className="text-[10px] text-muted-foreground">
                          Supports merge tags: <code className="bg-muted px-1 py-0.5 rounded text-foreground font-mono font-medium">{'{{first_name}}'}</code>, <code className="bg-muted px-1 py-0.5 rounded text-foreground font-mono font-medium">{'{{company_name}}'}</code>
                        </span>
                      </div>
                      <Input
                        value={initialSubject}
                        onChange={(e) => {
                          onInitialSubjectChange(e.target.value)
                          updateStep(0, { subject: e.target.value })
                        }}
                        placeholder="e.g. Quick question regarding {{company_name}}"
                        className="text-sm font-medium h-10"
                      />
                    </div>
                  ) : (
                    /* Step 2..N: Threading Option or Custom Subject */
                    <div className="space-y-3 bg-muted/30 border rounded-xl p-4">
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2.5 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={step.sendAsReply}
                            onChange={(e) => updateStep(idx, { sendAsReply: e.target.checked })}
                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                          />
                          <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                            <MessageSquare className="h-3.5 w-3.5 text-primary" />
                            Send as a reply in the existing conversation thread (Re: ...)
                          </span>
                        </label>
                        <span className="text-[10px] text-primary uppercase font-bold tracking-wider bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
                          Recommended
                        </span>
                      </div>

                      {step.sendAsReply ? (
                        <p className="text-xs text-muted-foreground pl-6 leading-relaxed">
                          📬 Email subject will automatically be set to <span className="font-semibold text-foreground">Re: {initialSubject || 'Your Subject'}</span> and linked with standard <code className="font-mono bg-muted px-1.5 py-0.5 rounded text-foreground">In-Reply-To</code> headers so Gmail, Google Workspace, and Outlook nest it directly into the original conversation thread.
                        </p>
                      ) : (
                        <div className="space-y-1.5 pl-6 pt-1">
                          <Label className="text-xs font-semibold flex items-center gap-1.5">
                            <Mail className="h-3.5 w-3.5 text-primary" />
                            New Separate Subject Line:
                          </Label>
                          <Input
                            value={step.subject || ''}
                            onChange={(e) => updateStep(idx, { subject: e.target.value })}
                            placeholder="e.g. Following up on my previous note"
                            className="text-xs h-9"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Visual Email Composer for this step */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold text-foreground">
                        {isStep1 ? 'Initial Email Body:' : `Follow-up #${idx} Message Body:`}
                      </Label>
                    </div>
                    <EmailComposer
                      value={step.htmlBody}
                      onChange={(html) => updateStep(idx, { htmlBody: html })}
                      placeholder={
                        isStep1
                          ? 'Write your compelling opening message here...'
                          : `Write your follow-up message (e.g. "Hi {{first_name}}, just wanted to bump this to the top of your inbox...")...`
                      }
                      minHeight="220px"
                      contacts={contacts}
                      selectedContactIndex={selectedContactIndex}
                      onContactIndexChange={onContactIndexChange}
                    />
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Add Follow-Up Step Button */}
      <div className="pt-2 flex justify-center">
        <Button
          type="button"
          variant="outline"
          onClick={addFollowupStep}
          className="border-dashed border-2 py-5 px-6 hover:border-primary hover:bg-primary/5 text-primary font-bold text-xs flex items-center gap-2 shadow-xs rounded-xl transition-all"
        >
          <Plus className="h-4 w-4" />
          Add Follow-up Step #{sequenceSteps.length + 1}
        </Button>
      </div>
    </div>
  )
}
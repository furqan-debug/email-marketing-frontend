'use client'

import React from 'react'
import {
  Plus,
  Trash2,
  Clock,
  MessageSquare,
  Mail,
  ChevronDown,
  Sparkles,
  ArrowDown
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
      <div className="flex flex-wrap items-center justify-between bg-primary/5 border border-primary/20 rounded-lg p-4 gap-2">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-primary/10 rounded-full text-primary">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h4 className="font-semibold text-sm text-foreground">
              Automated Follow-up Sequence Engine
            </h4>
            <p className="text-xs text-muted-foreground">
              Smartlead-style multi-step cold outreach with automated thread grouping and stop-on-reply.
            </p>
          </div>
        </div>
        <div className="text-xs font-semibold bg-background border px-3 py-1.5 rounded-md shadow-xs">
          {sequenceSteps.length} {sequenceSteps.length === 1 ? 'Step' : 'Steps'} • Approx. {totalDays} Days Total
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
                <div className="flex flex-col items-center justify-center my-2">
                  <div className="w-0.5 h-4 bg-border" />
                  <div className="flex items-center gap-2 bg-muted/80 border rounded-full px-4 py-1.5 shadow-xs my-1 text-xs">
                    <Clock className="h-3.5 w-3.5 text-primary" />
                    <span className="font-medium text-muted-foreground">Wait</span>
                    <select
                      className="h-6 text-xs bg-background border rounded px-2 font-semibold text-primary outline-none cursor-pointer"
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
                    <span className="font-medium text-muted-foreground">after Step {idx}</span>
                  </div>
                  <div className="w-0.5 h-4 bg-border" />
                  <ArrowDown className="h-3.5 w-3.5 text-muted-foreground -mt-1" />
                </div>
              )}

              {/* Step Card */}
              <div className="border rounded-xl bg-card shadow-xs overflow-hidden transition-all">
                {/* Step Header */}
                <div className="flex flex-wrap items-center justify-between bg-muted/30 px-5 py-3 border-b gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      isStep1 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-primary/20 text-primary'
                    }`}>
                      {idx + 1}
                    </span>
                    <div>
                      <h4 className="text-sm font-bold text-foreground">
                        {isStep1 ? 'Step 1: The Initial Email (Hook / Pitch)' : `Step ${idx + 1}: Follow-up #${idx}`}
                      </h4>
                      <p className="text-[11px] text-muted-foreground">
                        {isStep1 
                          ? 'Sent on launch to all new leads' 
                          : `Scheduled ${delayDays} day(s) after Step ${idx} if no reply`}
                      </p>
                    </div>
                  </div>

                  {!isStep1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeStep(idx)}
                      className="h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
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
                      <Label className="text-xs font-semibold">Initial Email Subject Line</Label>
                      <Input
                        value={initialSubject}
                        onChange={(e) => {
                          onInitialSubjectChange(e.target.value)
                          updateStep(0, { subject: e.target.value })
                        }}
                        placeholder="e.g. Quick question regarding {{company_name}}"
                        className="text-sm font-medium"
                      />
                    </div>
                  ) : (
                    /* Step 2..N: Threading Option or Custom Subject */
                    <div className="space-y-3 bg-muted/20 border rounded-lg p-3.5">
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={step.sendAsReply}
                            onChange={(e) => updateStep(idx, { sendAsReply: e.target.checked })}
                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                          />
                          <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                            <MessageSquare className="h-3.5 w-3.5 text-primary" />
                            Send as a reply in existing conversation thread (Re: ...)
                          </span>
                        </label>
                        <span className="text-[10px] text-muted-foreground uppercase font-mono bg-muted px-1.5 py-0.5 rounded">
                          Recommended
                        </span>
                      </div>

                      {step.sendAsReply ? (
                        <p className="text-xs text-muted-foreground pl-6">
                          📬 Email subject will automatically be set to <span className="font-semibold text-foreground">Re: {initialSubject || 'Your Subject'}</span> and linked with <code className="font-mono bg-muted px-1 rounded">In-Reply-To</code> headers so Gmail/Outlook groups it into the same thread.
                        </p>
                      ) : (
                        <div className="space-y-1.5 pl-6 pt-1">
                          <Label className="text-xs font-semibold flex items-center gap-1.5">
                            <Mail className="h-3 w-3" />
                            New Separate Subject Line:
                          </Label>
                          <Input
                            value={step.subject || ''}
                            onChange={(e) => updateStep(idx, { subject: e.target.value })}
                            placeholder="e.g. Following up on my previous note"
                            className="text-xs"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Visual Email Composer for this step */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-muted-foreground">
                      {isStep1 ? 'Initial Email Body:' : `Follow-up #${idx} Message Body:`}
                    </Label>
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
          className="border-dashed border-2 py-5 px-6 hover:border-primary hover:bg-primary/5 text-primary font-semibold text-xs flex items-center gap-2 shadow-xs"
        >
          <Plus className="h-4 w-4" />
          Add Follow-up Step #{sequenceSteps.length + 1}
        </Button>
      </div>
    </div>
  )
}
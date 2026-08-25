'use client'

import React, { useState } from 'react'

import {
  Plus,
  Trash2,
  Clock,
  MessageSquare,
  Mail,
  ArrowDown,
  Calendar,
  CalendarDays,
  Timer
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
      scheduledAt: null,
      sendAtTime: null,
      sendAsReply: false,
      subject: initialSubject || '',
      htmlBody: '',
    }
  ]

  // Track which connector has its expanded scheduling drawer open (default open for easy editing)
  const [expandedConnectors, setExpandedConnectors] = useState<Record<number, boolean>>({})

  const toggleConnector = (idx: number) => {
    setExpandedConnectors((prev) => ({
      ...prev,
      [idx]: prev[idx] === undefined ? false : !prev[idx],
    }))
  }

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
      scheduledAt: null,
      sendAtTime: '09:00',
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
      {/* Step Sequence Ladder */}
      <div className="space-y-4">

        {sequenceSteps.map((step, idx) => {
          const isStep1 = idx === 0
          const delayDays = Math.round((step.delayHours || 0) / 24)
          const isExactDateMode = !!step.scheduledAt
          const isConnectorOpen = expandedConnectors[idx] !== false // default open

          return (
            <div key={idx} className="space-y-4">
              {/* Connector / Flexible Date & Time Delay between steps */}
              {!isStep1 && (
                <div className="flex flex-col items-center justify-center my-2">
                  <div className="w-0.5 h-4 bg-primary/30" />
                  
                  {/* Scheduling Card */}
                  <div className="w-full max-w-xl bg-card border-2 border-primary/20 rounded-2xl p-4 shadow-sm space-y-3 transition-all hover:border-primary/40">
                    <div className="flex items-center justify-between border-b pb-2">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-primary" />
                        <span className="text-xs font-bold text-foreground">
                          Schedule Follow-up #{idx} (Step {idx + 1})
                        </span>
                      </div>
                      
                      {/* Mode Toggle: Relative Delay vs Exact Date/Time */}
                      <div className="flex items-center bg-muted/60 p-0.5 rounded-lg border text-[11px]">
                        <button
                          type="button"
                          onClick={() => updateStep(idx, { scheduledAt: null })}
                          className={`px-2.5 py-1 rounded-md font-semibold transition-all flex items-center gap-1 ${
                            !isExactDateMode
                              ? 'bg-background text-primary shadow-xs'
                              : 'text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          <Timer className="h-3 w-3" />
                          Relative Delay
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const defaultDate = new Date(Date.now() + (idx * 2) * 86400000)
                            defaultDate.setHours(9, 0, 0, 0)
                            const iso = defaultDate.toISOString().slice(0, 16)
                            updateStep(idx, { scheduledAt: iso })
                          }}
                          className={`px-2.5 py-1 rounded-md font-semibold transition-all flex items-center gap-1 ${
                            isExactDateMode
                              ? 'bg-background text-primary shadow-xs'
                              : 'text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          <CalendarDays className="h-3 w-3" />
                          Exact Date &amp; Time
                        </button>
                      </div>
                    </div>

                    {/* Mode 1: Relative Delay with custom Days/Hours & Preferred Time of Day */}
                    {!isExactDateMode ? (
                      <div className="space-y-3 pt-1">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                          {/* Delay Number & Unit */}
                          <div className="space-y-1">
                            <Label className="text-[11px] font-semibold text-muted-foreground">
                              Wait Interval after Step {idx}:
                            </Label>
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                min="1"
                                max="365"
                                value={
                                  step.delayHours % 24 === 0 && step.delayHours > 0
                                    ? step.delayHours / 24
                                    : step.delayHours
                                }
                                onChange={(e) => {
                                  const val = Math.max(1, Number(e.target.value) || 1)
                                  // Determine current unit
                                  const isDays = step.delayHours % 24 === 0
                                  updateStep(idx, { delayHours: isDays ? val * 24 : val })
                                }}
                                className="h-8 text-xs font-bold w-20"
                              />
                              <select
                                className="h-8 text-xs bg-background border rounded-lg px-2.5 font-semibold text-foreground outline-none cursor-pointer flex-1"
                                value={step.delayHours % 24 === 0 && step.delayHours > 0 ? 'days' : 'hours'}
                                onChange={(e) => {
                                  const isDays = e.target.value === 'days'
                                  const currentNum = step.delayHours % 24 === 0 && step.delayHours > 0 
                                    ? step.delayHours / 24 
                                    : Math.max(1, Math.round(step.delayHours / 24) || 1)
                                  updateStep(idx, { delayHours: isDays ? currentNum * 24 : currentNum })
                                }}
                              >
                                <option value="days">Days</option>
                                <option value="hours">Hours</option>
                              </select>
                            </div>
                          </div>

                          {/* Preferred Delivery Time of Day */}
                          <div className="space-y-1">
                            <Label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                              Preferred Delivery Time:
                            </Label>
                            <Input
                              type="time"
                              value={step.sendAtTime || '09:00'}
                              onChange={(e) => updateStep(idx, { sendAtTime: e.target.value })}
                              className="h-8 text-xs font-medium"
                            />
                          </div>
                        </div>

                        {/* Quick Presets */}
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          <span className="text-[10px] text-muted-foreground font-semibold mr-1">Quick Presets:</span>
                          {[
                            { label: '1 Day', hours: 24 },
                            { label: '2 Days', hours: 48 },
                            { label: '3 Days', hours: 72 },
                            { label: '5 Days', hours: 120 },
                            { label: '1 Week (7d)', hours: 168 },
                            { label: '2 Weeks (14d)', hours: 336 },
                          ].map((preset) => (
                            <button
                              key={preset.hours}
                              type="button"
                              onClick={() => updateStep(idx, { delayHours: preset.hours })}
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border transition-all ${
                                step.delayHours === preset.hours
                                  ? 'bg-primary text-primary-foreground border-primary'
                                  : 'bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground'
                              }`}
                            >
                              {preset.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      /* Mode 2: Exact Calendar Date & Time */
                      <div className="space-y-2 pt-1">
                        <Label className="text-[11px] font-semibold text-muted-foreground">
                          Select Specific Date &amp; Time for Step {idx + 1}:
                        </Label>
                        <Input
                          type="datetime-local"
                          value={step.scheduledAt ? step.scheduledAt.slice(0, 16) : ''}
                          onChange={(e) => updateStep(idx, { scheduledAt: e.target.value ? new Date(e.target.value).toISOString() : null })}
                          className="h-9 text-xs font-medium"
                        />
                        {step.scheduledAt && (
                          <p className="text-[11px] text-primary font-medium flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Scheduled for: {new Date(step.scheduledAt).toLocaleString(undefined, {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="w-0.5 h-4 bg-primary/30" />
                  <ArrowDown className="h-4 w-4 text-primary -mt-1" />
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
                        ) : step.scheduledAt ? (
                          <span className="text-[10px] font-semibold bg-purple-500/10 text-purple-700 px-2 py-0.5 rounded-full border border-purple-500/20">
                            Exact Date: {new Date(step.scheduledAt).toLocaleDateString()} {new Date(step.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold bg-blue-500/10 text-blue-700 px-2 py-0.5 rounded-full border border-blue-500/20">
                            Delay: {step.delayHours >= 24 ? `${step.delayHours / 24}d` : `${step.delayHours}h`} {step.sendAtTime ? `@ ${step.sendAtTime}` : ''}
                          </span>
                        )}
                      </h4>
                      <p className="text-[11px] text-muted-foreground">
                        {isStep1 
                          ? 'Opening pitch sent to all recipients when campaign is launched' 
                          : `Automatically dispatched ${
                              step.scheduledAt 
                                ? `on ${new Date(step.scheduledAt).toLocaleString()}` 
                                : `${step.delayHours >= 24 ? `${step.delayHours / 24} day(s)` : `${step.delayHours} hour(s)`} later`
                            } if prospect has not replied`}
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
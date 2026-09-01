'use client'

import React, { useMemo } from 'react'
import { AlertTriangle, CheckCircle2, Sparkles, Wrench, XCircle } from 'lucide-react'
import {
  validateMergeTags,
  fixMergeTagIssue,
  type MergeTagIssue,
} from '@/lib/mergeTags'

interface MergeTagAlertProps {
  content: string
  contacts?: any[]
  onFix?: (fixedContent: string, issue: MergeTagIssue) => void
  className?: string
  compact?: boolean
  showSuccessBadge?: boolean
}

export default function MergeTagAlert({
  content,
  contacts = [],
  onFix,
  className = '',
  compact = false,
  showSuccessBadge = false,
}: MergeTagAlertProps) {
  const analysis = useMemo(() => {
    return validateMergeTags(content, contacts)
  }, [content, contacts])

  if (!analysis.hasIssues && !showSuccessBadge) {
    return null
  }

  // If no issues and showSuccessBadge is true and valid tags exist
  if (!analysis.hasIssues && showSuccessBadge && analysis.validTagsFound.length > 0) {
    return (
      <div className={`flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg ${className}`}>
        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
        <span>
          Variables verified: <strong className="font-mono">{analysis.validTagsFound.join(', ')}</strong>
        </span>
      </div>
    )
  }

  if (!analysis.hasIssues) return null

  const handleFix = (issue: MergeTagIssue) => {
    if (!onFix || !issue.suggestion) return
    const fixed = fixMergeTagIssue(content, issue)
    onFix(fixed, issue)
  }

  if (compact) {
    return (
      <div className={`flex flex-wrap items-center gap-2 text-xs bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 px-3 py-1.5 rounded-lg shadow-xs animate-in fade-in ${className}`}>
        <div className="flex items-center gap-1.5 font-bold text-amber-700 dark:text-amber-400">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          <span>Variable Warning:</span>
        </div>
        {analysis.issues.map((issue) => (
          <div key={issue.id} className="flex items-center gap-1.5 bg-background/80 border border-amber-500/30 px-2 py-0.5 rounded font-mono text-[11px]">
            <span className="line-through text-destructive font-semibold">{issue.raw}</span>
            {issue.suggestion && (
              <>
                <span className="text-muted-foreground">→</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">{issue.suggestion}</span>
                {onFix && (
                  <button
                    type="button"
                    onClick={() => handleFix(issue)}
                    className="ml-1 text-[10px] font-bold bg-primary text-primary-foreground hover:bg-primary/90 px-1.5 py-0.5 rounded shadow-xs transition-transform hover:scale-105"
                  >
                    ⚡ Fix
                  </button>
                )}
              </>
            )}
            <span className="text-[10px] text-muted-foreground font-sans ml-1">({issue.message})</span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className={`bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 rounded-xl p-3 text-xs shadow-xs animate-in fade-in space-y-2 ${className}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 font-bold text-amber-800 dark:text-amber-300">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <span>Possible Merge Tag / Variable Mistake Detected ({analysis.issues.length}):</span>
        </div>
      </div>

      <div className="space-y-1.5 pl-6">
        {analysis.issues.map((issue) => (
          <div
            key={issue.id}
            className="flex flex-wrap items-center justify-between gap-2 bg-background/90 border border-amber-500/30 px-3 py-1.5 rounded-lg shadow-2xs"
          >
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono bg-destructive/10 text-destructive border border-destructive/20 px-1.5 py-0.5 rounded font-bold">
                {issue.raw}
              </span>
              <span className="text-muted-foreground text-[11px] font-medium">{issue.message}</span>
            </div>

            {issue.suggestion && (
              <div className="flex items-center gap-2 ml-auto">
                <span className="text-[11px] text-muted-foreground">Suggested:</span>
                <code className="font-mono bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded font-bold">
                  {issue.suggestion}
                </code>
                {onFix && (
                  <button
                    type="button"
                    onClick={() => handleFix(issue)}
                    className="flex items-center gap-1 text-[11px] font-bold bg-primary text-primary-foreground hover:bg-primary/90 px-2 py-1 rounded-md shadow-xs transition-transform hover:scale-105"
                  >
                    <Wrench className="h-3 w-3" />
                    Auto-Fix
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

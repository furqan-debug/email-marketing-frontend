/**
 * Merge Tag & Variable Validation Engine
 * Detects invalid variables, typos, malformed syntax (single braces, unclosed tags),
 * and provides intelligent suggestions based on standard fields and audience attributes.
 */

export interface MergeTagDefinition {
  key: string
  label: string
  tag: string
  aliases: string[]
}

export const STANDARD_MERGE_TAGS: MergeTagDefinition[] = [
  { key: 'first_name', label: 'First Name', tag: '{{first_name}}', aliases: ['firstname', 'fname', 'first', 'first-name', 'f_name', 'firs_name', 'firt_name', 'first_nam'] },
  { key: 'last_name', label: 'Last Name', tag: '{{last_name}}', aliases: ['lastname', 'lname', 'last', 'last-name', 'l_name', 'las_name', 'last_nam'] },
  { key: 'company_name', label: 'Company Name', tag: '{{company_name}}', aliases: ['company', 'companyname', 'company-name', 'compnay', 'compny', 'organization', 'org', 'business', 'business_name', 'comp_name'] },
  { key: 'title', label: 'Job Title', tag: '{{title}}', aliases: ['job_title', 'jobtitle', 'job-title', 'role', 'position', 'designation', 'designtion', 'job', 'occupation'] },
  { key: 'email', label: 'Email Address', tag: '{{email}}', aliases: ['email_address', 'mail', 'emailaddress', 'emai', 'e-mail'] },
]


export interface MergeTagIssue {
  id: string
  type: 'unknown_variable' | 'single_brace' | 'malformed_syntax' | 'empty_tag'
  raw: string
  key: string
  message: string
  suggestion?: string
  severity: 'error' | 'warning'
}

export interface MergeTagValidationResult {
  hasIssues: boolean
  issues: MergeTagIssue[]
  validTagsFound: string[]
  availableTags: { key: string; label: string; tag: string }[]
}

/**
 * Calculates Levenshtein edit distance between two strings
 */
function levenshteinDistance(s1: string, s2: string): number {
  const a = s1.toLowerCase()
  const b = s2.toLowerCase()
  const costs: number[] = []

  for (let i = 0; i <= a.length; i++) {
    let lastValue = i
    for (let j = 0; j <= b.length; j++) {
      if (i === 0) {
        costs[j] = j
      } else if (j > 0) {
        let newValue = costs[j - 1]
        if (a.charAt(i - 1) !== b.charAt(j - 1)) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1
        }
        costs[j - 1] = lastValue
        lastValue = newValue
      }
    }
    if (i > 0) costs[b.length] = lastValue
  }
  return costs[b.length]
}

/**
 * Extracts all unique attribute keys available in an audience contact list
 */
export function extractAvailableMergeTags(contacts?: any[]): { key: string; label: string; tag: string }[] {
  const tagsMap = new Map<string, { key: string; label: string; tag: string }>()

  // 1. Add standard tags
  for (const std of STANDARD_MERGE_TAGS) {
    tagsMap.set(std.key.toLowerCase(), { key: std.key, label: std.label, tag: std.tag })
  }

  // 2. Discover custom attributes from contacts
  if (contacts && Array.isArray(contacts)) {
    const sampleSize = Math.min(contacts.length, 100)
    for (let i = 0; i < sampleSize; i++) {
      const contact = contacts[i]
      if (contact && contact.attributes && typeof contact.attributes === 'object') {
        for (const [attrKey, attrVal] of Object.entries(contact.attributes)) {
          if (!attrKey) continue
          const cleanKey = attrKey.trim()
          const lowerKey = cleanKey.toLowerCase()
          if (!tagsMap.has(lowerKey) && !STANDARD_MERGE_TAGS.some(s => s.aliases.includes(lowerKey))) {
            const formattedLabel = cleanKey
              .replace(/[_-]/g, ' ')
              .replace(/\b\w/g, c => c.toUpperCase())
            tagsMap.set(lowerKey, {
              key: cleanKey,
              label: formattedLabel,
              tag: `{{${cleanKey}}}`,
            })
          }
        }
      }
    }
  }

  return Array.from(tagsMap.values())
}

/**
 * Finds the closest matching valid merge tag for a typo/unknown key
 */
export function findBestMergeTagSuggestion(
  unknownKey: string,
  availableTags: { key: string; label: string; tag: string }[]
): string | null {
  const clean = unknownKey.trim().toLowerCase()
  if (!clean) return null

  // 1. Check known aliases
  for (const std of STANDARD_MERGE_TAGS) {
    if (std.key === clean || std.aliases.includes(clean) || std.aliases.includes(clean.replace(/[_-]/g, ''))) {
      return std.tag
    }
  }

  // 2. Check audience custom tags (case-insensitive & stripped)
  const strippedClean = clean.replace(/[_-]/g, '')
  for (const avail of availableTags) {
    const availLower = avail.key.toLowerCase()
    if (availLower === clean || availLower.replace(/[_-]/g, '') === strippedClean) {
      return avail.tag
    }
  }

  // 3. Levenshtein fuzzy match
  let bestCandidate: string | null = null
  let minDistance = 999

  // Check against standard tags & their aliases
  for (const std of STANDARD_MERGE_TAGS) {
    const dist = levenshteinDistance(clean, std.key)
    if (dist < minDistance && dist <= 3) {
      minDistance = dist
      bestCandidate = std.tag
    }
    for (const alias of std.aliases) {
      const aliasDist = levenshteinDistance(clean, alias)
      if (aliasDist < minDistance && aliasDist <= 3) {
        minDistance = aliasDist
        bestCandidate = std.tag
      }
    }
  }

  // Check against custom audience tags
  for (const avail of availableTags) {
    const dist = levenshteinDistance(clean, avail.key.toLowerCase())
    if (dist < minDistance && dist <= 3) {
      minDistance = dist
      bestCandidate = avail.tag
    }
  }

  return bestCandidate
}

/**
 * Validates text or HTML content for merge tag issues, syntax errors, and unknown variables.
 */
export function validateMergeTags(
  content: string | undefined | null,
  contacts?: any[]
): MergeTagValidationResult {
  if (!content || typeof content !== 'string') {
    return {
      hasIssues: false,
      issues: [],
      validTagsFound: [],
      availableTags: extractAvailableMergeTags(contacts),
    }
  }

  const availableTags = extractAvailableMergeTags(contacts)
  const knownKeysSet = new Set<string>()

  // Register all known keys and aliases
  for (const std of STANDARD_MERGE_TAGS) {
    knownKeysSet.add(std.key.toLowerCase())
    for (const a of std.aliases) knownKeysSet.add(a.toLowerCase())
    knownKeysSet.add(std.key.toLowerCase().replace(/_/g, ''))
  }
  for (const avail of availableTags) {
    knownKeysSet.add(avail.key.toLowerCase())
    knownKeysSet.add(avail.key.toLowerCase().replace(/[_-]/g, ''))
  }

  const issues: MergeTagIssue[] = []
  const validTagsFound: string[] = []
  const seenIssues = new Set<string>()

  // Strip HTML tags for clean text scanning, but preserve bracket content
  const textContent = content
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')

  // 1. Check for empty tags {{}} or {{  }}
  const emptyTagRegex = /\{\{\s*\}\}/g
  let match: RegExpExecArray | null
  while ((match = emptyTagRegex.exec(textContent)) !== null) {
    const raw = match[0]
    if (!seenIssues.has(raw)) {
      seenIssues.add(raw)
      issues.push({
        id: `empty-${match.index}`,
        type: 'empty_tag',
        raw,
        key: '',
        message: 'Empty merge tag {{}} with no variable name',
        severity: 'error',
      })
    }
  }

  // 2. Scan all double-brace tags: {{ variable_name }}
  const doubleBraceRegex = /\{\{\s*([^{}]+?)\s*\}\}/g
  while ((match = doubleBraceRegex.exec(textContent)) !== null) {
    const raw = match[0]
    const innerKey = match[1].trim()
    if (!innerKey) continue

    const lowerInner = innerKey.toLowerCase()
    const strippedInner = lowerInner.replace(/[_-]/g, '')

    const isValid = knownKeysSet.has(lowerInner) || knownKeysSet.has(strippedInner)

    if (isValid) {
      if (!validTagsFound.includes(raw)) {
        validTagsFound.push(raw)
      }
    } else {
      if (!seenIssues.has(raw)) {
        seenIssues.add(raw)
        const suggestion = findBestMergeTagSuggestion(innerKey, availableTags)
        issues.push({
          id: `unknown-${innerKey}-${match.index}`,
          type: 'unknown_variable',
          raw,
          key: innerKey,
          message: `Unknown variable '${innerKey}'. Not found in standard tags or audience attributes.`,
          suggestion: suggestion || undefined,
          severity: 'warning',
        })
      }
    }
  }

  // 3. Scan for single-brace mistakes: {first_name}, {company_name}, etc.
  const singleBraceRegex = /(?<!\{)\{([a-zA-Z0-9_]{2,30})\}(?!\})/g
  while ((match = singleBraceRegex.exec(textContent)) !== null) {
    const raw = match[0]
    const innerKey = match[1].trim()
    const lowerInner = innerKey.toLowerCase()
    const strippedInner = lowerInner.replace(/[_-]/g, '')

    if (knownKeysSet.has(lowerInner) || knownKeysSet.has(strippedInner) || findBestMergeTagSuggestion(innerKey, availableTags)) {
      if (!seenIssues.has(raw)) {
        seenIssues.add(raw)
        const canonicalSuggestion = findBestMergeTagSuggestion(innerKey, availableTags) || `{{${innerKey}}}`
        issues.push({
          id: `single-${innerKey}-${match.index}`,
          type: 'single_brace',
          raw,
          key: innerKey,
          message: `Single brace '${raw}' detected. Variables must use double braces.`,
          suggestion: canonicalSuggestion,
          severity: 'warning',
        })
      }
    }
  }

  // 4. Scan for unclosed opening braces: {{first_name (without closing }})
  const unclosedOpeningRegex = /\{\{([a-zA-Z0-9_]{2,30})(?!\}\})(?:[\s.,!?<>]|$)/g
  while ((match = unclosedOpeningRegex.exec(textContent)) !== null) {
    const raw = match[0].trim()
    const innerKey = match[1].trim()
    if (!raw.endsWith('}}') && !seenIssues.has(raw)) {
      seenIssues.add(raw)
      issues.push({
        id: `unclosed-open-${innerKey}-${match.index}`,
        type: 'malformed_syntax',
        raw,
        key: innerKey,
        message: `Missing closing '}}' in '${raw}'`,
        suggestion: `{{${innerKey}}}`,
        severity: 'error',
      })
    }
  }

  return {
    hasIssues: issues.length > 0,
    issues,
    validTagsFound,
    availableTags,
  }
}

/**
 * Replaces an invalid/typo merge tag in a text or HTML string with its suggested replacement.
 */
export function fixMergeTagIssue(content: string, issue: MergeTagIssue): string {
  if (!content || !issue || !issue.suggestion || !issue.raw) return content
  return content.split(issue.raw).join(issue.suggestion)
}

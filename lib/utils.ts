import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatRate(rate: number): string {
  return (rate * 100).toFixed(1) + "%"
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

export function renderContactPreview(rawHtml: string, contact?: any | null): string {
  let preview = rawHtml || '<p style="color:#888;">(Empty email body)</p>'
  if (!contact) {
    preview = preview.replace(/\{\{\s*first_name\s*\}\}/gi, 'Alex')
    preview = preview.replace(/\{\{\s*last_name\s*\}\}/gi, 'Morgan')
    preview = preview.replace(/\{\{\s*company_name\s*\}\}/gi, 'Acme Corp')
    preview = preview.replace(/\{\{\s*company\s*\}\}/gi, 'Acme Corp')
    preview = preview.replace(/\{\{\s*title\s*\}\}/gi, 'Marketing Director')
    preview = preview.replace(/\{\{\s*job_title\s*\}\}/gi, 'Marketing Director')
    preview = preview.replace(/\{\{\s*email\s*\}\}/gi, 'alex.morgan@example.com')
    preview = preview.replace(/\{\{\s*unsubscribe\s*\}\}/gi, '#unsubscribe')
    return preview
  }

  const attrs = (contact.attributes || {}) as Record<string, any>

  return preview.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, rawKey: string) => {
    const key = rawKey.toLowerCase()
    const cleanKey = key.replace(/[^a-z0-9]/g, '')

    if (['first_name', 'firstname', 'fname', 'first', 'first-name', 'f_name'].includes(key) || cleanKey === 'firstname' || cleanKey === 'fname') {
      return contact.firstName || ''
    }
    if (['last_name', 'lastname', 'lname', 'last', 'last-name', 'l_name'].includes(key) || cleanKey === 'lastname' || cleanKey === 'lname') {
      return contact.lastName || ''
    }
    if (['email', 'email_address', 'mail', 'emailaddress', 'e-mail'].includes(key) || cleanKey === 'email') {
      return contact.email || ''
    }

    if (attrs[rawKey] !== undefined && attrs[rawKey] !== null && String(attrs[rawKey]).trim() !== '') return String(attrs[rawKey])
    if (attrs[key] !== undefined && attrs[key] !== null && String(attrs[key]).trim() !== '') return String(attrs[key])

    const TITLE_ALIASES = ['title', 'job_title', 'jobtitle', 'job-title', 'job', 'role', 'position', 'designation', 'occupation']
    if (TITLE_ALIASES.includes(key) || TITLE_ALIASES.map(a => a.replace(/[^a-z0-9]/g, '')).includes(cleanKey)) {
      for (const alias of ['title', 'job_title', 'jobTitle', 'jobtitle', 'job-title', 'role', 'position', 'designation', 'job', 'occupation']) {
        if (attrs[alias] !== undefined && attrs[alias] !== null && String(attrs[alias]).trim() !== '') {
          return String(attrs[alias])
        }
      }
      const matchedTitleKey = Object.keys(attrs).find(k => {
        const kClean = k.toLowerCase().replace(/[^a-z0-9]/g, '')
        return ['title', 'jobtitle', 'job', 'role', 'position', 'designation'].includes(kClean)
      })
      if (matchedTitleKey && attrs[matchedTitleKey] !== undefined && attrs[matchedTitleKey] !== null) {
        return String(attrs[matchedTitleKey])
      }
    }

    const COMPANY_ALIASES = ['company_name', 'company', 'companyname', 'company-name', 'organization', 'org', 'business', 'business_name', 'comp_name', 'compnay', 'compny']
    if (COMPANY_ALIASES.includes(key) || COMPANY_ALIASES.map(a => a.replace(/[^a-z0-9]/g, '')).includes(cleanKey)) {
      for (const alias of ['company_name', 'companyName', 'company', 'companyname', 'organization', 'org', 'business', 'business_name', 'comp_name']) {
        if (attrs[alias] !== undefined && attrs[alias] !== null && String(attrs[alias]).trim() !== '') {
          return String(attrs[alias])
        }
      }
      const matchedCompKey = Object.keys(attrs).find(k => {
        const kClean = k.toLowerCase().replace(/[^a-z0-9]/g, '')
        return ['companyname', 'company', 'organization', 'org', 'business', 'businessname'].includes(kClean)
      })
      if (matchedCompKey && attrs[matchedCompKey] !== undefined && attrs[matchedCompKey] !== null) {
        return String(attrs[matchedCompKey])
      }
    }

    const noUnder = key.replace(/_/g, '')
    const found = Object.keys(attrs).find(k => k.toLowerCase().replace(/[^a-z0-9]/g, '') === noUnder)
    if (found && attrs[found] !== undefined && attrs[found] !== null && String(attrs[found]).trim() !== '') {
      return String(attrs[found])
    }

    return ''
  })
}


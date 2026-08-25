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
    if (key === 'first_name' || key === 'firstname') {
      return contact.firstName || ''
    }
    if (key === 'last_name' || key === 'lastname') {
      return contact.lastName || ''
    }
    if (key === 'email') {
      return contact.email || ''
    }
    if (key === 'unsubscribe' || key === 'unsubscribe_url') {
      return '#unsubscribe'
    }

    if (attrs[rawKey] !== undefined && attrs[rawKey] !== null) return String(attrs[rawKey])
    if (attrs[key] !== undefined && attrs[key] !== null) return String(attrs[key])

    if (key === 'company_name' || key === 'company') {
      return attrs.companyName || attrs.company_name || attrs.company || ''
    }
    if (key === 'title' || key === 'job_title' || key === 'jobtitle') {
      return attrs.title || attrs.jobTitle || attrs.job_title || ''
    }

    const noUnder = key.replace(/_/g, '')
    const found = Object.keys(attrs).find(k => k.toLowerCase().replace(/_/g, '') === noUnder)
    if (found && attrs[found] !== undefined && attrs[found] !== null) {
      return String(attrs[found])
    }

    return ''
  })
}


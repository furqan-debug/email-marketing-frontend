export interface Workspace {
  id: string
  name: string
}

export interface Audience {
  id: string
  name: string
  workspaceId: string
  _count?: { contacts: number; campaigns: number }
}

export interface Contact {
  id: string
  email: string
  firstName?: string | null
  lastName?: string | null
  audienceId: string
}

export interface PaginatedContacts {
  data: Contact[]
  total: number
  page: number
  limit: number
  pages: number
}

export interface Template {
  id: string
  name: string
  subject?: string | null
  html?: string
}

export type CampaignStatus = "DRAFT" | "SENDING" | "PAUSED" | "COMPLETED" | "CANCELLED"

export interface Campaign {
  id: string
  name: string
  status: CampaignStatus
  audienceId: string
  subject?: string | null
  fromName?: string | null
  htmlBody?: string | null
  templateId?: string | null
  snapshot?: AnalyticsSnapshot | null
}

export interface AnalyticsRates {
  deliveryRate: number
  openRate: number
  clickRate: number
  bounceRate: number
  complaintRate: number
}

export interface AnalyticsSnapshot {
  campaignId: string
  sent: number
  delivered: number
  opened: number
  clicked: number
  totalOpens: number
  totalClicks: number
  bounced: number
  complained: number
  rates: AnalyticsRates
  computedAt: string
  staleWarning: boolean
}

export interface ImportResult {
  imported: number
  skipped: number
  errors: number
  errorDetails: string[]
}

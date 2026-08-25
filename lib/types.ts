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
  attributes?: Record<string, any> | null
  audienceId: string
}

export interface ColumnMapping {
  email?: string
  firstName?: string
  lastName?: string
  attributes?: Record<string, string>
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

export interface CampaignStep {
  id: string
  campaignId: string
  stepOrder: number
  delayHours: number
  sendAsReply: boolean
  subject?: string | null
  htmlBody: string
  templateId?: string | null
  createdAt: string
}

export interface SequenceStepInput {
  stepOrder: number
  delayHours: number
  sendAsReply: boolean
  subject?: string
  htmlBody: string
  templateId?: string
}

export interface SequenceLead {
  id: string
  email: string
  name: string
  currentStep: number
  status: string
  lastSentAt?: string | null
  nextSendAt?: string | null
}

export interface SequenceProgress {
  totalLeads: number
  steps: Array<{
    stepOrder: number
    delayHours: number
    sendAsReply: boolean
    subject?: string | null
    activeAtStep: number
    sentAtStep: number
  }>
  statusCounts: {
    ACTIVE: number
    WAITING_DELAY: number
    COMPLETED: number
    PAUSED: number
    UNSUBSCRIBED: number
    REPLIED: number
    BOUNCED: number
  }
  leads: SequenceLead[]
}

export type CampaignStatus = "DRAFT" | "SENDING" | "PAUSED" | "COMPLETED" | "CANCELLED"

export interface Campaign {
  id: string
  name: string
  status: CampaignStatus
  isSequence?: boolean
  audienceId: string
  subject?: string | null
  fromName?: string | null
  fromEmail?: string | null
  replyTo?: string | null
  htmlBody?: string | null
  templateId?: string | null
  steps?: CampaignStep[]
  snapshot?: AnalyticsSnapshot | null
  _count?: { leads?: number; messages?: number }
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

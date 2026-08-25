import type {
  Workspace, Audience, Contact, PaginatedContacts,
  Template, Campaign, AnalyticsSnapshot, ImportResult,
  ColumnMapping, CampaignStep, SequenceStepInput, SequenceProgress,
} from "./types"


const BASE = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "")

async function req<T>(path: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    Accept: "application/json",
  }
  
  // Only set Content-Type if there is an actual request body that is not FormData
  if (options?.body && !(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json"
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`
  const res = await fetch(`${BASE}${normalizedPath}`, {
    ...options,
    headers: {
      ...headers,
      ...(options?.headers as Record<string, string> | undefined),
    },
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as any).message || `HTTP ${res.status}`)
  }
  return res.json() as Promise<T>
}

// ── Workspaces ───────────────────────────────────────────────────────────────
export const getWorkspaces = () => req<Workspace[]>("/workspaces")

// ── Audiences ────────────────────────────────────────────────────────────────
export const getAudiences = (workspaceId?: string) =>
  req<Audience[]>(`/audiences${workspaceId ? `?workspaceId=${workspaceId}` : ""}`)
export const getAudience = (id: string) => req<Audience>(`/audiences/${id}`)
export const createAudience = (body: { name: string; workspaceId: string }) =>
  req<Audience>("/audiences", { method: "POST", body: JSON.stringify(body) })
export const deleteAudience = (id: string) =>
  req<{ id: string; deleted: boolean }>(`/audiences/${id}`, { method: "DELETE" })

// ── Contacts ─────────────────────────────────────────────────────────────────
export const getContacts = (audienceId: string, page = 1, limit = 50) =>
  req<PaginatedContacts>(`/contacts?audienceId=${audienceId}&page=${page}&limit=${limit}`)
export const deleteContact = (id: string) =>
  req<{ id: string; deleted: boolean }>(`/contacts/${id}`, { method: "DELETE" })
export const importCsv = async (
  audienceId: string,
  file: File,
  mapping?: ColumnMapping,
): Promise<ImportResult> => {
  const fd = new FormData()
  fd.append("file", file)
  if (mapping) {
    fd.append("mapping", JSON.stringify(mapping))
  }
  const res = await fetch(`${BASE}/contacts/import?audienceId=${audienceId}`, {
    method: "POST",
    body: fd,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as any).message || `HTTP ${res.status}`)
  }
  return res.json() as Promise<ImportResult>
}

// ── Templates ────────────────────────────────────────────────────────────────
export const getTemplates = () => req<Template[]>("/templates")
export const getTemplate = (id: string) => req<Template>(`/templates/${id}`)
export const createTemplate = (body: { name: string; subject?: string; html: string }) =>
  req<Template>("/templates", { method: "POST", body: JSON.stringify(body) })
export const updateTemplate = (id: string, body: Partial<{ name: string; subject: string; html: string }>) =>
  req<Template>(`/templates/${id}`, { method: "PATCH", body: JSON.stringify(body) })
export const deleteTemplate = (id: string) =>
  req<{ id: string; deleted: boolean }>(`/templates/${id}`, { method: "DELETE" })

// ── Campaigns ────────────────────────────────────────────────────────────────
export const getCampaigns = () => req<Campaign[]>("/campaigns")
export const getCampaign = (id: string) => req<Campaign>(`/campaigns/${id}`)
export const createCampaign = (body: {
  name: string
  audienceId: string
  subject?: string
  fromName?: string
  fromEmail?: string
  replyTo?: string
  htmlBody?: string
  templateId?: string
  isSequence?: boolean
  steps?: SequenceStepInput[]
}) => req<Campaign>("/campaigns", { method: "POST", body: JSON.stringify(body) })
export const getCampaignSteps = (id: string) => req<CampaignStep[]>(`/campaigns/${id}/steps`)
export const saveCampaignSteps = (id: string, steps: SequenceStepInput[]) =>
  req<CampaignStep[]>(`/campaigns/${id}/steps`, { method: "POST", body: JSON.stringify({ steps }) })
export const getSequenceProgress = (id: string) => req<SequenceProgress>(`/campaigns/${id}/sequence-progress`)
export const generateMessages = (id: string) =>
  req<{ created: number; suppressed: number; skipped: number }>(`/campaigns/${id}/generate-messages`, { method: "POST" })
export const sendCampaign = (id: string) => req<Campaign>(`/campaigns/${id}/send`, { method: "POST" })
export const pauseCampaign = (id: string) => req<Campaign>(`/campaigns/${id}/pause`, { method: "POST" })
export const resumeCampaign = (id: string) => req<Campaign>(`/campaigns/${id}/resume`, { method: "POST" })
export const cancelCampaign = (id: string) => req<Campaign>(`/campaigns/${id}/cancel`, { method: "POST" })
export const deleteCampaign = (id: string) =>
  req<{ id: string; deleted: boolean }>(`/campaigns/${id}`, { method: "DELETE" })


// ── Analytics ────────────────────────────────────────────────────────────────
export const getAnalytics = (id: string) => req<AnalyticsSnapshot>(`/analytics/campaigns/${id}`)
export const computeAnalytics = (id: string) =>
  req<AnalyticsSnapshot>(`/analytics/campaigns/${id}/compute`, { method: "POST" })

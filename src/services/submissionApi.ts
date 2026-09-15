import { request } from './api'
import type { ApiSubmission, ApiUrlCheck } from './api/types'

export interface SubmissionInput {
  websiteName: string
  url: string
  description: string
  requestedUniverseId?: string
  tags: string[]
  /** Honeypot field; must stay empty. */
  website?: string
}

export const submissionApi = {
  async checkUrl(url: string, signal?: AbortSignal) {
    const res = await request<ApiUrlCheck>('/submissions/check', { query: { url }, signal, timeout: 6000 })
    return res.data
  },
  async submit(input: SubmissionInput) {
    const res = await request<ApiSubmission>('/submissions', { method: 'POST', body: input })
    return res.data
  },
}

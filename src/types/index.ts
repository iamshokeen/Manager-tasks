// src/types/index.ts
export type Priority = 'critical' | 'high' | 'medium' | 'low'
export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'blocked' | 'done'
export type ProjectStage = 'planning' | 'active' | 'review' | 'closed'
export type MemberStatus = 'active' | 'hiring' | 'on_leave' | 'exited'
export type OneOnOneMood = 'great' | 'good' | 'neutral' | 'concerned' | 'bad'
export type ActivityType = 'status_change' | 'comment' | 'edit' | 'assignment' | 'completion' | 'email_sent'
export type ActivitySource = 'user' | 'system'

export interface ApiResponse<T> {
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
}

export interface TaskFilters {
  assigneeId?: string
  department?: string
  status?: TaskStatus
  priority?: Priority
  isSelfTask?: boolean
  projectId?: string
  stakeholderId?: string
  search?: string
}

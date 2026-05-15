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
  assignedByName?: string
  contributorFilter?: { teamMemberId?: string; name: string }
  ownershipFilter?: { userId: string; teamMemberId?: string }
  // Manager-chain visibility (2026-05-14 spec). When present, only tasks
  // created by — or assigned to a TeamMember linked to — one of these user
  // IDs are returned. SA bypass is handled at the route layer (passes no
  // filter).
  visibleUserIds?: string[]
  sortBy?:
    | 'due_asc' | 'due_desc'
    | 'priority_desc' | 'priority_asc'
    | 'created_desc' | 'created_asc'
    | 'title_asc' | 'title_desc'
  priorityIn?: string[]
  departmentIn?: string[]
  assigneeIdIn?: string[]
  assignedByNameIn?: string[]
  stakeholderIdIn?: string[]
  dueWindow?: 'overdue' | 'today' | 'week' | 'month' | 'none' | 'any'
  createdWindow?: 'today' | 'week' | 'month' | 'any'
}

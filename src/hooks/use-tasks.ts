import useSWR from 'swr'
import type { TaskFilters } from '@/types'

const fetcher = (url: string) => fetch(url).then(r => r.json()).then(r => r.data)

export function useTasks(filters: TaskFilters = {}) {
  const params = new URLSearchParams()
  if (filters.assigneeId) params.set('assigneeId', filters.assigneeId)
  if (filters.department) params.set('department', filters.department)
  if (filters.status) params.set('status', filters.status)
  if (filters.priority) params.set('priority', filters.priority)
  if (filters.isSelfTask !== undefined) params.set('isSelfTask', String(filters.isSelfTask))
  if (filters.projectId) params.set('projectId', filters.projectId)
  if (filters.stakeholderId) params.set('stakeholderId', filters.stakeholderId)
  if (filters.search) params.set('search', filters.search)
  if (filters.assignedByName) params.set('assignedByName', filters.assignedByName)
  if (filters.priorityIn?.length) params.set('priorityIn', filters.priorityIn.join(','))
  if (filters.departmentIn?.length) params.set('departmentIn', filters.departmentIn.join(','))
  if (filters.assigneeIdIn?.length) params.set('assigneeIdIn', filters.assigneeIdIn.join(','))
  if (filters.assignedByNameIn?.length) params.set('assignedByNameIn', filters.assignedByNameIn.join(','))
  if (filters.stakeholderIdIn?.length) params.set('stakeholderIdIn', filters.stakeholderIdIn.join(','))
  if (filters.dueWindow && filters.dueWindow !== 'any') params.set('dueWindow', filters.dueWindow)
  if (filters.createdWindow && filters.createdWindow !== 'any') params.set('createdWindow', filters.createdWindow)
  if (filters.sortBy) params.set('sortBy', filters.sortBy)

  const query = params.toString()
  const { data, error, mutate, isLoading } = useSWR(`/api/tasks${query ? `?${query}` : ''}`, fetcher)
  return { tasks: data ?? [], error, mutate, isLoading }
}

export function useTask(id: string) {
  const { data, error, mutate, isLoading } = useSWR(id ? `/api/tasks/${id}` : null, fetcher)
  return { task: data, error, mutate, isLoading }
}

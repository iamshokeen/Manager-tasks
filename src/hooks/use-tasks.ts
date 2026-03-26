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

  const query = params.toString()
  const { data, error, mutate, isLoading } = useSWR(`/api/tasks${query ? `?${query}` : ''}`, fetcher)
  return { tasks: data ?? [], error, mutate, isLoading }
}

export function useTask(id: string) {
  const { data, error, mutate, isLoading } = useSWR(id ? `/api/tasks/${id}` : null, fetcher)
  return { task: data, error, mutate, isLoading }
}
